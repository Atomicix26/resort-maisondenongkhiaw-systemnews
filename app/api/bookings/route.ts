import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────────────────────
// POST — สร้างการจองใหม่
// Body: { roomId, checkIn, checkOut, guests, totalPrice, specialRequest }
// ─────────────────────────────────────────────────────────────
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

  const { roomId, checkIn, checkOut, guests, totalPrice, specialRequest } = body

  if (!roomId || !checkIn || !checkOut || !guests || !totalPrice) {
    return NextResponse.json({ message: "ຂໍ້ມູນບໍ່ຄົບ" }, { status: 400 })
  }

  const checkInDate  = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return NextResponse.json({ message: "ວັນທີບໍ່ຖືກຕ້ອງ" }, { status: 400 })
  }

  if (checkInDate >= checkOutDate) {
    return NextResponse.json({ message: "ວັນ Check-out ຕ້ອງຫຼັງຈາກ Check-in" }, { status: 400 })
  }

  try {
    // ตรวจสอบห้อง
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room || !room.isActive) {
      return NextResponse.json({ message: "ບໍ່ພົບຫ້ອງ" }, { status: 404 })
    }
    if (room.status === "MAINTENANCE") {
      return NextResponse.json({ message: "ຫ້ອງນີ້ຢູ່ໃນລະຫວ່າງການສ້ອມແປງ" }, { status: 409 })
    }

    // ตรวจ date conflict
    const conflict = await prisma.booking.findFirst({
      where: {
        roomId,
        status:   { notIn: ["CANCELLED"] },
        checkIn:  { lt: checkOutDate },
        checkOut: { gt: checkInDate  },
        deletedAt: null,
      },
    })
    if (conflict) {
      return NextResponse.json(
        { message: "ຫ້ອງນີ້ຖຶກຈອງໃນຊ່ວງວັນທີດັ່ງກ່າວແລ້ວ" },
        { status: 409 }
      )
    }

    // ── สร้าง Booking + PaymentTransaction ใน transaction เดียว ──
    const result = await prisma.$transaction(async (tx) => {
      // 1. สร้าง Booking (ไม่มี paymentStatus อีกต่อไป)
      const booking = await tx.booking.create({
        data: {
          userId:         session.user.id,
          roomId,
          checkIn:        checkInDate,
          checkOut:       checkOutDate,
          guests:         Number(guests),
          totalPrice:     Number(totalPrice),
          status:         "CONFIRMED",       // auto confirm
          specialRequest: specialRequest ?? null,
        },
        include: {
          room: { select: { name: true, price: true, view: true } },
        },
      })

      // 2. สร้าง PaymentTransaction ที่ยังไม่ได้จ่าย
      const transaction = await tx.paymentTransaction.create({
        data: {
          bookingId: booking.id,
          type:      "CHARGE",
          amount:    Number(totalPrice),
          method:    "TRANSFER",          // default — user เลือกได้ทีหลัง
          status:    "PENDING",
        },
      })

      return { booking, transaction }
    })

    return NextResponse.json(
      {
        booking:     result.booking,
        transaction: result.transaction,
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("[BOOKINGS_POST]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// GET — ดึงรายการจองของ user ที่ login อยู่
// ─────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId:    session.user.id,
        deletedAt: null,
      },
      include: {
        room: {
          select: {
            id:      true,
            name:    true,
            images:  true,
            view:    true,
            bedType: true,
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1, // transaction ล่าสุด
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const parsed = bookings.map((b) => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      room: {
        ...b.room,
        images: safeJson(b.room.images, []),
      },
      // สรุปสถานะการชำระจาก transaction ล่าสุด
      paymentStatus:  b.transactions[0]?.status  ?? "PENDING",
      paymentMethod:  b.transactions[0]?.method  ?? null,
      paymentAmount:  b.transactions[0]
        ? Number(b.transactions[0].amount)
        : null,
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