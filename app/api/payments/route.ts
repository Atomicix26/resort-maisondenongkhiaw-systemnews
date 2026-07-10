import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getIP, RATE_LIMITS } from "@/lib/ratelimit"
import { expireStaleBookings } from "@/lib/expire"
import { saveImageUpload } from "@/lib/upload"

// ✅ ลบ credit_card ออก + map status ให้ถูกต้อง
const METHOD_MAP: Record<string, "TRANSFER" | "CASH"> = {
  transfer:     "TRANSFER",
  pay_at_hotel: "CASH",
}

// ✅ pay_at_hotel ยังไม่ได้จ่าย → PENDING (ไม่ใช่ PAID)
const STATUS_MAP: Record<string, "PENDING_VERIFY" | "PENDING"> = {
  transfer:     "PENDING_VERIFY",
  pay_at_hotel: "PENDING",
}

// booking ถูกยกเลิก/เปลี่ยนสถานะระหว่างที่กำลังชำระ (race กับ expiry sweep หรือ admin)
class BookingNotPayableError extends Error {}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // ── Rate limit: 10 ครั้ง / 15 นาที ต่อ user และต่อ IP (BUG-007) ──────
  // กันยิงอัปสลิป/สร้างธุรกรรมรัวๆ และกัน upload abuse
  const ip = getIP(request)
  for (const key of [`payment:user:${session.user.id}`, `payment:ip:${ip}`]) {
    const rl = checkRateLimit(key, RATE_LIMITS.payment)
    if (!rl.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))
      return NextResponse.json(
        { message: "ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າສັກຄູ່" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      )
    }
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 })
  }

  // ✅ ลบ cardNumber ออก
  const bookingId = formData.get("bookingId") as string
  const method    = formData.get("method")    as string
  const slipFile  = formData.get("slipFile")  as File | null

  if (!bookingId || !method) {
    return NextResponse.json({ message: "ຂໍ້ມູນບໍ່ຄົບ" }, { status: 400 })
  }

  const paymentMethod = METHOD_MAP[method]
  if (!paymentMethod) {
    return NextResponse.json({ message: "ວິທີຊຳລະບໍ່ຖືກຕ້ອງ" }, { status: 400 })
  }

  try {
    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId, deletedAt: null },
      include: {
        transactions: {
          where:   { type: "CHARGE" },
          orderBy: { createdAt: "desc" },
          take:    1,
        },
      },
    })

    if (!booking) return NextResponse.json({ message: "ບໍ່ພົບລາຍການຈອງ" }, { status: 404 })
    if (booking.userId !== session.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 })

    const pendingTx = booking.transactions[0]
    if (!pendingTx) return NextResponse.json({ message: "ບໍ່ພົບລາຍການຊຳລະ" }, { status: 404 })
    if (["PAID", "PENDING_VERIFY"].includes(pendingTx.status)) {
      return NextResponse.json({ message: "ຊຳລະເງິນໄປແລ້ວ" }, { status: 409 })
    }

    // ── booking ຕ້ອງຢູ່ສະຖານະ PENDING ເທົ່ານັ້ນຈຶ່ງຮັບຊຳລະໄດ້ ─────────────────
    // ກັນບັນທຶກການຊຳລະໃຫ້ booking ທີ່ຖືກຍົກເລີກ/ຢືນຢັນ/ເຊັກອິນໄປແລ້ວ. auto-cancel
    // ຕັ້ງ status=CANCELLED ໂດຍ CHARGE tx ກາຍເປັນ FAILED (ບໍ່ແມ່ນ PAID/PENDING_VERIFY)
    // ຈຶ່ງຜ່ານການກວດ tx ຂ້າງເທິງ — ຕ້ອງກັນຢູ່ຊັ້ນ booking.status ນຳ.
    if (booking.status !== "PENDING") {
      const message =
        booking.status === "CANCELLED"
          ? "ໝົດເວລາຊຳລະ ຫຼື ການຈອງຖືກຍົກເລີກແລ້ວ ກະລຸນາຈອງໃໝ່"
          : "ການຈອງນີ້ບໍ່ຢູ່ໃນສະຖານະທີ່ຊຳລະໄດ້"
      return NextResponse.json({ message }, { status: 409 })
    }

    // ── ໝົດເວລາຊຳລະ (10 ນາທີ) ແຕ່ຍັງບໍ່ຖືກກວາດ → ຍົກເລີກ + ປະຕິເສດ ───────────
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      await expireStaleBookings()
      return NextResponse.json(
        { message: "ໝົດເວລາຊຳລະ — ການຈອງນີ້ຖືກຍົກເລີກແລ້ວ ກະລຸນາຈອງໃໝ່" },
        { status: 409 }
      )
    }

    let slipFileName: string | null = null

    // ── Bank Transfer: ต้องมีสลิป ──────────────────────────────
    if (method === "transfer") {
      if (!slipFile) {
        return NextResponse.json({ message: "ກະລຸນາອັບໂຫຼດສລິບ" }, { status: 400 })
      }
      const saved = await saveImageUpload(slipFile, "payment-slips", "slip")
      if (!saved.ok) {
        return NextResponse.json({ message: saved.error }, { status: 400 })
      }
      slipFileName = saved.filename
    }

    // ── Pay at Hotel: ไม่ต้องมีสลิป ────────────────────────────
    const updated = await prisma.$transaction(async (tx) => {
      // re-check ในทรานแซกชัน: กัน race กับ expiry sweep / admin cancel ที่อาจ
      // ยกเลิก booking หลังอ่านค่าด้านบนแต่ก่อนบันทึกการชำระ
      const fresh = await tx.booking.findUnique({
        where:  { id: booking.id },
        select: { status: true, expiresAt: true },
      })
      if (!fresh || fresh.status !== "PENDING" || (fresh.expiresAt && fresh.expiresAt < new Date())) {
        throw new BookingNotPayableError()
      }

      const u = await tx.paymentTransaction.update({
        where: { id: pendingTx.id },
        data: {
          method:      paymentMethod,
          status:      STATUS_MAP[method],
          slipImage:   slipFileName,
          // ✅ pay_at_hotel ยังไม่ได้จ่าย → paymentDate เป็น null
          paymentDate: method === "transfer" ? new Date() : null,
        },
      })
      // ลูกค้าดำเนินการชำระ (อัปสลิป/เลือกจ่ายที่ hotel) แล้ว →
      // ปลด expiresAt เพื่อไม่ให้ auto-cancel ยกเลิก booking นี้
      await tx.booking.update({
        where: { id: booking.id },
        data:  { expiresAt: null },
      })
      return u
    })

    return NextResponse.json({
      success:       true,
      transactionId: updated.id,
      status:        updated.status,
      message:
        method === "transfer"
          ? "ອັບໂຫຼດສລິບສຳເລັດ — ກຳລັງລໍຖ້າ Admin ກວດສອບ"
          : "ຈອງສຳເລັດ — ຊຳລະໄດ້ທີ່ Hotel ໃນວັນ Check-in",
    })

  } catch (error) {
    if (error instanceof BookingNotPayableError) {
      return NextResponse.json(
        { message: "ໝົດເວລາຊຳລະ ຫຼື ການຈອງຖືກຍົກເລີກແລ້ວ ກະລຸນາຈອງໃໝ່" },
        { status: 409 }
      )
    }
    console.error("[PAYMENT_POST]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const bookingId = new URL(request.url).searchParams.get("bookingId")
  if (!bookingId) {
    return NextResponse.json({ message: "bookingId is required" }, { status: 400 })
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId, deletedAt: null } })
    if (!booking) return NextResponse.json({ message: "ບໍ່ພົບ Booking" }, { status: 404 })

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
    if (booking.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const transactions = await prisma.paymentTransaction.findMany({
      where:   { bookingId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    })
  } catch (error) {
    console.error("[PAYMENT_GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}