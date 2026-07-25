import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"
import { saveImageUpload } from "@/lib/upload"
import { nextId } from "@/lib/ids"

type Params = { params: Promise<{ id: string }> }

// PATCH /api/admin/cancel-requests/[id]
//  • JSON  { action: "APPROVE" | "REJECT" }  → อนุมัติ/ปฏิเสธคำขอยกเลิก
//       APPROVE: ยกเลิก booking + สร้าง REFUND transaction (PENDING) ถ้ามียอดคืน
//  • multipart (slipFile) → ยืนยันว่าโอนเงินคืนแล้ว + แนบสลิป (REFUND → PAID)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasRole(session.user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const staff = await prisma.staff.findFirst({ where: { userId: session.user.id } })

    const cancelReq = await prisma.cancelRequest.findUnique({
      where:   { id },
      include: { booking: true },
    })
    if (!cancelReq) return NextResponse.json({ error: "ບໍ່ພົບຄຳຮ້ອງ" }, { status: 404 })

    const contentType = request.headers.get("content-type") ?? ""

    // ── ยืนยันโอนเงินคืนแล้ว + แนบสลิป (multipart) ──────────────────────────
    if (contentType.includes("multipart/form-data")) {
      const fd   = await request.formData()
      const file = fd.get("slipFile")
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "ກະລຸນາແນບສລິບການໂອນຄືນ" }, { status: 400 })
      }
      const refundTx = await prisma.paymentTransaction.findFirst({
        where:   { bookingId: cancelReq.bookingId, type: "REFUND", status: "PENDING" },
        orderBy: { createdAt: "desc" },
      })
      if (!refundTx) return NextResponse.json({ error: "ບໍ່ພົບລາຍການເງິນຄືນທີ່ລໍຖ້າໂອນ" }, { status: 404 })

      const saved = await saveImageUpload(file, "payment-slips", "refund")
      if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 })

      const updated = await prisma.paymentTransaction.update({
        where: { id: refundTx.id },
        data:  {
          status:           "PAID",
          slipImage:        saved.filename,
          paymentDate:      new Date(),
          verifiedById:     staff?.id ?? null,
          verifiedByUserId: session.user.id,
          verifiedAt:       new Date(),
        },
      })
      return NextResponse.json({ refund: updated })
    }

    // ── อนุมัติ / ปฏิเสธ (JSON) ────────────────────────────────────────────
    const { action } = await request.json()
    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "action ต้องเป็น APPROVE หรือ REJECT" }, { status: 400 })
    }
    if (cancelReq.status !== "PENDING") {
      return NextResponse.json({ error: "ຄຳຮ້ອງนี้ถูกดำเนินการไปแล้ว" }, { status: 409 })
    }

    if (action === "REJECT") {
      const updated = await prisma.cancelRequest.update({
        where: { id },
        data:  { status: "REJECTED", actionDate: new Date(), staffId: staff?.id ?? null },
      })
      return NextResponse.json({ cancelRequest: updated })
    }

    // APPROVE → ยกเลิก booking + สร้าง REFUND transaction (ถ้ามียอดคืน)
    const refundAmount = cancelReq.refundAmount ? Number(cancelReq.refundAmount) : 0
    const result = await prisma.$transaction(async (tx) => {
      const cr = await tx.cancelRequest.update({
        where: { id },
        data:  { status: "APPROVED", actionDate: new Date(), staffId: staff?.id ?? null },
      })
      await tx.booking.update({
        where: { id: cancelReq.bookingId },
        data:  { status: "CANCELLED", expiresAt: null },
      })
      let refund = null
      if (refundAmount > 0) {
        refund = await tx.paymentTransaction.create({
          data: {
            id:        nextId("paymentTransaction"),
            bookingId: cancelReq.bookingId,
            type:      "REFUND",
            amount:    refundAmount,
            method:    "TRANSFER",
            status:    "PENDING", // รอ admin โอนจริง + แนบสลิป
            reason:    `ຄືນເງິນ ${cancelReq.refundPercent ?? 0}% ຕາມນະໂຍບາຍຍົກເລີກ`,
          },
        })
      }
      return { cancelRequest: cr, refund }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[ADMIN_CANCEL_REQUEST_PATCH]", error)
    return NextResponse.json({ error: "Failed to process cancel request" }, { status: 500 })
  }
}
