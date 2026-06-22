import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStayPricing } from "@/lib/pricing"

// ── ตรวจว่า error เกิดจาก serialization/deadlock (ควร retry) ──────────
// P2034 = Prisma: transaction failed due to write conflict or deadlock
function isSerializationError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2034"
  }
  const msg = error instanceof Error ? error.message : ""
  return /deadlock|lock wait timeout|\b1213\b|\b1205\b|40001/i.test(msg)
}

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

  // ── กันจองวันที่ผ่านมาแล้ว (BUG-008) ────────────────────────────────
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  if (checkInDate < todayStart) {
    return NextResponse.json({ message: "ວັນ Check-in ຕ້ອງບໍ່ເປັນວັນທີຜ່ານມາ" }, { status: 400 })
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

    // คิดราคาต่อคืน รองรับการพักข้าม season (BUG-014)
    const pricing    = await getStayPricing(room, checkInDate, checkOutDate)
    const totalPrice = pricing.total

    // ── กัน double-booking (BUG-004) ────────────────────────────────
    // ใช้ Serializable เพื่อให้ conflict-check ล็อกช่วง index (next-key lock)
    // → transaction คู่แข่งที่จองวันทับกัน insert ไม่ได้ จนกว่าจะ commit
    // หาก InnoDB เกิด deadlock/serialization → retry แล้วเช็คใหม่
    const MAX_ATTEMPTS = 3
    let result: { booking: unknown; transaction: unknown } | null = null

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        result = await prisma.$transaction(async (tx) => {

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
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

        break // สำเร็จ

      } catch (txError) {
        // deadlock/serialization ชั่วคราว → ถอยเล็กน้อยแล้วลองใหม่
        if (isSerializationError(txError) && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 25 * attempt))
          continue
        }
        // retry หมดเพราะ contention → ถือว่าห้องถูกแย่งจอง (409)
        if (isSerializationError(txError)) {
          throw new Error("ROOM_UNAVAILABLE")
        }
        throw txError
      }
    }

    if (!result) {
      throw new Error("ROOM_UNAVAILABLE")
    }

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
