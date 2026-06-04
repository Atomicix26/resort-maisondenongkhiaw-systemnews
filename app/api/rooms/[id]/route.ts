import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RoomStatus } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: params.id, deletedAt: null, isActive: true },
      select: {
        id: true, roomNumber: true, name: true, description: true,
        price: true, capacity: true, bedType: true, size: true,
        view: true, images: true, amenities: true,
        status: true, featured: true,
        roomType: { select: { typeName: true } },
      },
    })
    if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({
      ...room,
      price:     Number(room.price),
      images:    tryParse(room.images as string | null, []),
      amenities: tryParse(room.amenities as string | null, []),
    })
  } catch (error) {
    console.error("[ROOM_GET_ID]", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
function tryParse(val: string | null, fallback: unknown) {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

// PATCH /api/rooms/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { name, description, price, capacity, bedType, size, view,
            images, amenities, status, featured, roomNumber, isActive } = body

    // ถ้าเปลี่ยน status → บันทึก StatusRoom log ด้วย
    if (status) {
      const current = await prisma.room.findUnique({ where: { id: params.id }, select: { status: true } })
      if (current && current.status !== status) {
        const staff = await prisma.staff.findFirst({ where: { userId: session.user.id } })
        await prisma.statusRoom.create({
          data: {
            roomId:    params.id,
            staffId:   staff?.id ?? null,
            oldStatus: current.status,
            newStatus: status as RoomStatus,
          },
        })
      }
    }

    const room = await prisma.room.update({
      where: { id: params.id },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price       !== undefined && { price: parseFloat(price) }),
        ...(capacity    !== undefined && { capacity: parseInt(capacity) }),
        ...(bedType     !== undefined && { bedType }),
        ...(size        !== undefined && { size: size ? parseInt(size) : null }),
        ...(view        !== undefined && { view }),
        ...(images      !== undefined && { images: JSON.stringify(images) }),
        ...(amenities   !== undefined && { amenities: JSON.stringify(amenities) }),
        ...(status      !== undefined && { status: status as RoomStatus }),
        ...(featured    !== undefined && { featured }),
        ...(roomNumber  !== undefined && { roomNumber }),
        ...(isActive    !== undefined && { isActive }),
      },
    })
    return NextResponse.json(room)
  } catch (error) {
    console.error("[ROOMS_PATCH]", error)
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 })
  }
}

// DELETE /api/rooms/[id] — soft delete
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // เช็คว่ามี active booking ไหม
    const activeBooking = await prisma.booking.findFirst({
      where: { roomId: params.id, deletedAt: null, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    })
    if (activeBooking) {
      return NextResponse.json({ error: "ລຶບບໍ່ໄດ້ — ຫ້ອງນີ້ມີການຈອງຢູ່" }, { status: 400 })
    }

    await prisma.room.update({
      where: { id: params.id },
      data:  { deletedAt: new Date(), isActive: false },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ROOMS_DELETE]", error)
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 })
  }
}