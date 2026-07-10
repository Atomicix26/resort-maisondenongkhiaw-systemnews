import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeRefund } from "@/lib/refund"
import { nextId } from "@/lib/ids"

// POST — User ส่งคำขอยกเลิก
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: {
    bookingId?: string; reason?: string
    refundBankName?: string; refundAccountName?: string; refundAccountNumber?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

  const { bookingId, reason } = body

  if (!bookingId || !reason?.trim()) {
    return NextResponse.json({ message: "ກະລຸນາລະບຸ Booking ແລະ ເຫດຜົນ" }, { status: 400 })
  }

  try {
    // ตรวจสอบ booking เป็นของ user นี้ + ดึงยอดที่จ่ายมาแล้ว (PAID CHARGE)
    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId, deletedAt: null },
      include: {
        transactions: {
          where:   { type: "CHARGE", status: "PAID" },
          orderBy: { createdAt: "desc" },
          take:    1,
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ message: "ບໍ່ພົບການຈອງ" }, { status: 404 })
    }
    if (booking.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return NextResponse.json(
        { message: "ບໍ່ສາມາດຍົກເລີກໄດ້ໃນສະຖານະນີ້" },
        { status: 422 }
      )
    }

    // ตรวจว่ายังไม่มีคำขอยกเลิกอยู่
    const existing = await prisma.cancelRequest.findUnique({
      where: { bookingId },
    })
    if (existing) {
      return NextResponse.json(
        { message: "ມີຄຳຮ້ອງຍົກເລີກຢູ່ແລ້ວ" },
        { status: 409 }
      )
    }

    // ── ยอดที่จ่ายมาแล้วจริง → คำนวณเงินคืนตามนโยบายเวลา (ตอนขอยกเลิก) ──
    const paidAmount = booking.transactions[0] ? Number(booking.transactions[0].amount) : 0
    const hasRefund  = paidAmount > 0
    const { percent, amount } = hasRefund
      ? computeRefund(paidAmount, booking.checkIn)
      : { percent: 0, amount: 0 }

    // ต้องมีบัญชีรับเงินคืน ถ้ามียอดต้องคืน (ไม่มี payment gateway → โอนคืนมือ)
    const bankName = body.refundBankName?.trim()
    const accName  = body.refundAccountName?.trim()
    const accNo    = body.refundAccountNumber?.trim()
    if (amount > 0 && (!bankName || !accName || !accNo)) {
      return NextResponse.json(
        { message: "ກະລຸນາລະບຸ ທะນາຄານ / ຊື່ບັນຊີ / ເລກບັນຊີ ສຳລັບຮັບເງິນຄືນ" },
        { status: 400 }
      )
    }

    const cancelReq = await prisma.cancelRequest.create({
      data: {
        id:                  nextId("cancelRequest"),
        bookingId,
        userId:              session.user.id,
        reason:              reason.trim(),
        status:              "PENDING",
        refundable:          hasRefund,
        refundPercent:       hasRefund ? percent : null,
        refundAmount:        hasRefund ? amount  : null,
        refundBankName:      amount > 0 ? bankName : null,
        refundAccountName:   amount > 0 ? accName  : null,
        refundAccountNumber: amount > 0 ? accNo    : null,
      },
    })

    return NextResponse.json({ cancelRequest: cancelReq }, { status: 201 })

  } catch (error) {
    console.error("[CANCEL_REQUEST_POST]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// GET — ดึงคำขอยกเลิกของ user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const requests = await prisma.cancelRequest.findMany({
      where:   { userId: session.user.id },
      include: { booking: { include: { room: { select: { name: true } } } } },
      orderBy: { requestDate: "desc" },
    })

    return NextResponse.json({ requests })

  } catch (error) {
    console.error("[CANCEL_REQUEST_GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}