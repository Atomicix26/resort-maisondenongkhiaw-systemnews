import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, RoomStatus } from "@prisma/client"
import { nextId } from "@/lib/ids"
import { expireStaleBookings } from "@/lib/expire"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search   = searchParams.get("search") ?? ""
    const featured = searchParams.get("featured")
    const all      = searchParams.get("all")
    const checkIn  = searchParams.get("checkIn")
    const checkOut = searchParams.get("checkOut")

    if (all === "true") {
      const session = await getServerSession(authOptions)
      if (session?.user?.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    let checkInDate: Date | null = null
    let checkOutDate: Date | null = null
    const hasDateRange = Boolean(checkIn && checkOut)
    if (hasDateRange) {
      checkInDate = new Date(checkIn!)
      checkOutDate = new Date(checkOut!)
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkInDate >= checkOutDate) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
      }
      await expireStaleBookings()
    }

    const rooms = await prisma.room.findMany({
      where: {
        deletedAt: null,
        isActive: all === "true" ? undefined : true,
        ...(featured === "true" ? { featured: true } : {}),
        ...(search ? {
          OR: [
            { name:        { contains: search } },
            { description: { contains: search } },
            { bedType:     { contains: search } },
          ],
        } : {}),
      },
      select: {
        id: true, roomNumber: true, name: true, description: true,
        roomTypeId: true,
        price: true, capacity: true, bedType: true, size: true,
        view: true, images: true, amenities: true,
        status: true, featured: true, isActive: true,
        roomType: { select: { typeName: true, basePrice: true } },
        _count:   { select: { bookings: true } },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
    })

    const reviewCounts = await prisma.$queryRaw<Array<{ roomId: string; count: bigint }>>`
      SELECT b.roomId, COUNT(r.id) AS count
      FROM reviews r
      INNER JOIN bookings b ON b.id = r.bookingId
      WHERE r.deletedAt IS NULL
      GROUP BY b.roomId
    `
    const reviewsByRoom = new Map(reviewCounts.map((row) => [row.roomId, Number(row.count)]))

    const conflicts = hasDateRange && checkInDate && checkOutDate && rooms.length > 0
      ? await prisma.booking.findMany({
          where: {
            deletedAt: null,
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            roomId: { in: rooms.map((room) => room.id) },
            checkIn: { lt: checkOutDate },
            checkOut: { gt: checkInDate },
          },
          select: { roomId: true },
        })
      : []
    const bookedRoomIds = new Set(conflicts.map((booking) => booking.roomId))

    const parsed = rooms.map((room) => {
      const blockedByMaintenance = room.status === "MAINTENANCE"
      const blockedByBooking = hasDateRange && bookedRoomIds.has(room.id)
      return {
        ...room,
        price: Number(room.price),
        images: tryParse(room.images as string | null, []),
        amenities: tryParse(room.amenities as string | null, []),
        available: !blockedByMaintenance && !blockedByBooking,
        unavailableReason: blockedByMaintenance
          ? "ປິດປັບປຸງ"
          : blockedByBooking
            ? "ບໍ່ວ່າງໃນຊ່ວງວັນທີນີ້"
            : null,
        _count: { ...room._count, reviews: reviewsByRoom.get(room.id) ?? 0 },
      }
    })

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("[ROOMS_GET]", error)
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { roomNumber, name, description, price, capacity, bedType, size, view,
            images, amenities, status, featured, roomTypeId } = body

    if (!name || !price || !capacity) {
      return NextResponse.json({ error: "name, price, capacity ຈຳເປັນ" }, { status: 400 })
    }

    const room = await prisma.room.create({
      data: {
        id: nextId("room"),
        roomNumber, name, description,
        price:     parseFloat(price),
        capacity:  parseInt(capacity),
        bedType, size: size ? parseInt(size) : null, view,
        images:    images    ? JSON.stringify(images)    : null,
        amenities: amenities ? JSON.stringify(amenities) : null,
        status:    (status as RoomStatus) ?? "AVAILABLE",
        featured:  featured ?? false,
        roomTypeId: roomTypeId ?? null,
      },
    })
    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "ໝາຍເລກຫ້ອງນີ້ມີໃນລະບົບແລ້ວ" }, { status: 409 })
    }
    console.error("[ROOMS_POST]", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}

function tryParse(val: string | null, fallback: unknown) {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}
