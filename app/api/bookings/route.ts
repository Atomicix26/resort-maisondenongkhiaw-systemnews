import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEffectiveNightlyPrice } from "@/lib/pricing"

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

  const { roomId, checkIn, checkOut, guests, specialRequest } = body

  if (!roomId || !checkIn || !checkOut || !guests) {
    return NextResponse.json({ message: "ຂໍ້ມູນບໍ່ຄົບ" }, { status: 400 })
  }

  const checkInDate  = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return NextResponse.json({ message: "ວັນທີບໍ່ຖືກຕ້ອງ" }, { status: 400 })
  }

  if (checkInDate >= checkOutDate) {
    return NextResponse.json({ message: "ວັນ Check-out ຕ້ອງຫຼັງ Check-in" }, { status: 400 })
  }

  const guestCount = Number(guests)
  if (isNaN(guestCount) || guestCount < 1) {
    return NextResponse.json({ message: "ຈຳນວນຜູ້ເຂົ້າພັກບໍ່ຖືກຕ້ອງ" }, { status: 400 })
  }

  try {
    // ── ดึงข้อมูลห้องก่อน transaction (read-only) ────────────
    const room = await prisma.room.findUnique({ where: { id: roomId } })

    if (!room || !room.isActive) {
      return NextResponse.json({ message: "ບໍ່ພົບຫ້ອງ" }, { status: 404 })
    }
    if (room.status === "MAINTENANCE") {
      return NextResponse.json({ message: "ຫ້ອງນີ້ຢູ່ໃນລະຫວ່າງການສ້ອມແປງ" }, { status: 409 })
    }
    if (guestCount > room.capacity) {
      return NextResponse.json(
        { message: `ຫ້ອງນີ້ຮອງຮັບໄດ້ສູງສຸດ ${room.capacity} ທ່ານ` },
        { status: 400 }
      )
    }

    const nights     = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
    )
    const pricing = await getEffectiveNightlyPrice(room, checkInDate, checkOutDate)
    const totalPrice = pricing.nightlyPrice * nights

    const result = await prisma.$transaction(async (tx) => {

      const conflict = await tx.booking.findFirst({
        where: {
          roomId,
          status:    { notIn: ["CANCELLED"] },
          checkIn:   { lt: checkOutDate },
          checkOut:  { gt: checkInDate  },
          deletedAt: null,
        },
      })
      if (conflict) {
        throw new Error("ROOM_UNAVAILABLE")
      }

      // 2. สร้าง Booking ด้วยราคาที่คำนวณจาก server
      const booking = await tx.booking.create({
        data: {
          userId:         session.user.id,
          roomId,
          checkIn:        checkInDate,
          checkOut:       checkOutDate,
          guests:         guestCount,
          totalPrice,                      
          status:         "PENDING",
          specialRequest: specialRequest ?? null,
        },
        include: {
          room: { select: { name: true, price: true, view: true } },
        },
      })

      const transaction = await tx.paymentTransaction.create({
        data: {
          bookingId: booking.id,
          type:      "CHARGE",
          amount:    totalPrice,            // ✅ server-calculated
          method:    "TRANSFER",
          status:    "PENDING",
        },
      })

      return { booking, transaction }
    })

    return NextResponse.json(
      { booking: result.booking, transaction: result.transaction },
      { status: 201 }
    )

  } catch (error) {
    if (error instanceof Error && error.message === "ROOM_UNAVAILABLE") {
      return NextResponse.json(
        { message: "ຫ້ອງນີ້ຖຶກຈອງໃນຊ່ວງວັນທີດັ່ງກ່າວແລ້ວ" },
        { status: 409 }
      )
    }
    console.error("[BOOKINGS_POST]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// GET — user login
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const bookings = await prisma.booking.findMany({
      where:   { userId: session.user.id, deletedAt: null },
      include: {
        room: {
          select: { id: true, name: true, images: true, view: true, bedType: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        review: {
          select: { id: true, rating: true, comment: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const parsed = bookings.map((b) => ({
      ...b,
      totalPrice:    Number(b.totalPrice),
      room:          { ...b.room, images: safeJson(b.room.images, []) },
      paymentStatus: b.transactions[0]?.status ?? "PENDING",
      paymentMethod: b.transactions[0]?.method ?? null,
      paymentAmount: b.transactions[0] ? Number(b.transactions[0].amount) : null,
      review:        b.review,
    }))

    return NextResponse.json({ bookings: parsed })

  } catch (error) {
    console.error("[BOOKINGS_GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}
