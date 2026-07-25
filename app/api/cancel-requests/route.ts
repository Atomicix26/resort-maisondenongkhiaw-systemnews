import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeRefund } from "@/lib/refund"
import { nextId } from "@/lib/ids"
import { saveImageUpload } from "@/lib/upload"

// POST — User ส่งคำขอยกเลิก
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let bookingId = ""
  let reason = ""
  let refundBankName = ""
  let refundAccountName = ""
  let refundAccountNumber = ""
  let refundQrFile: File | null = null
  try {
    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      bookingId = String(formData.get("bookingId") ?? "")
      reason = String(formData.get("reason") ?? "")
      refundBankName = String(formData.get("refundBankName") ?? "")
      refundAccountName = String(formData.get("refundAccountName") ?? "")
      refundAccountNumber = String(formData.get("refundAccountNumber") ?? "")
      const qr = formData.get("refundQrFile")
      refundQrFile = qr instanceof File ? qr : null
    } else {
      const body = await request.json()
      bookingId = String(body.bookingId ?? "")
      reason = String(body.reason ?? "")
      refundBankName = String(body.refundBankName ?? "")
      refundAccountName = String(body.refundAccountName ?? "")
      refundAccountNumber = String(body.refundAccountNumber ?? "")
    }
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

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
    const bankName = refundBankName?.trim()
    const accName  = refundAccountName?.trim()
    const accNo    = refundAccountNumber?.trim()
    if (amount > 0 && (!bankName || !accName || !accNo)) {
      return NextResponse.json(
        { message: "ກະລຸນາລະບຸ ທะນາຄານ / ຊື່ບັນຊີ / ເລກບັນຊີ ສຳລັບຮັບເງິນຄືນ" },
        { status: 400 }
      )
    }

    let refundQrImage: string | null = null
    if (refundQrFile instanceof File && refundQrFile.size > 0) {
      const saved = await saveImageUpload(refundQrFile, "payment-slips", "refund_qr")
      if (!saved.ok) {
        return NextResponse.json({ message: saved.error }, { status: 400 })
      }
      refundQrImage = saved.filename
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
        refundBankName:      bankName || null,
        refundAccountName:   accName  || null,
        refundAccountNumber: accNo    || null,
      },
    })

    if (refundQrImage) {
      await prisma.$executeRaw`
        UPDATE cancel_requests
        SET refundQrImage = ${refundQrImage}
        WHERE id = ${cancelReq.id}
      `
    }

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
