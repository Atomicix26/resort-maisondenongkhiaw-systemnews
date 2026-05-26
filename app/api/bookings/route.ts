import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST — สร้างการจองใหม่
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

  const { roomId, checkIn, checkOut, guests, specialRequest, totalPrice } = body

  if (!roomId || !checkIn || !checkOut || !guests || !totalPrice) {
    return NextResponse.json({ message: "ຂໍ້ມູນບໍ່ຄົບ" }, { status: 400 })
  }

  try {
    const checkInDate  = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    if (checkInDate >= checkOutDate) {
      return NextResponse.json({ message: "ວັນທີບໍ່ຖືກຕ້ອງ" }, { status: 400 })
    }

    // ตรวจสอบว่าห้องมีอยู่
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room || !room.isActive) {
      return NextResponse.json({ message: "ບໍ່ພົບຫ້ອງ" }, { status: 404 })
    }

    // ตรวจ conflict
    const conflict = await prisma.booking.findFirst({
      where: {
        roomId,
        status: { not: "CANCELLED" },
        checkIn:  { lt: checkOutDate },
        checkOut: { gt: checkInDate  },
      },
    })

    if (conflict) {
      return NextResponse.json({ message: "ຫ້ອງນີ້ຖຶກຈອງໃນຊ່ວງວັນທີດັ່ງກ່າວແລ້ວ" }, { status: 409 })
    }

    const booking = await prisma.booking.create({
      data: {
        userId:         session.user.id,
        roomId,
        checkIn:        checkInDate,
        checkOut:       checkOutDate,
        guests:         Number(guests),
        totalPrice:     Number(totalPrice),
        status:         "CONFIRMED",
        paymentStatus:  "UNPAID",
        specialRequest: specialRequest ?? null,
      },
      include: { room: { select: { name: true, price: true } } },
    })

    return NextResponse.json({ booking }, { status: 201 })

  } catch (error) {
    console.error("[BOOKINGS_POST]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// GET — ดึงรายการจองของ user ที่ login อยู่
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const bookings = await prisma.booking.findMany({
      where:   { userId: session.user.id },
      include: { room: { select: { id: true, name: true, images: true, view: true } } },
      orderBy: { createdAt: "desc" },
    })

    const parsed = bookings.map((b) => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      room: {
        ...b.room,
        images: safeParseJson(b.room.images, []),
      },
    }))

    return NextResponse.json({ bookings: parsed })

  } catch (error) {
    console.error("[BOOKINGS_GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}