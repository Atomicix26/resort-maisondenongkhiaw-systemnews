import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"
import { PaymentStatus } from "@prisma/client"
import { sendNotificationEmail, generatePaymentVerifyEmailHtml } from "@/lib/mail" // นำเข้า generator
import broadcaster from "@/lib/notifications/broadcaster"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    
    if (!hasRole(session.user.role, ADMIN_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { status, reason } = await request.json()
    if (!["PAID", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "status ຕ້ອງເປັນ PAID ຫຼື FAILED" }, { status: 400 })
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : ""
    if (status === "FAILED" && !trimmedReason) {
      return NextResponse.json({ error: "ກະລຸນາລະບຸເຫດຜົນໃນການປະຕິເສດ" }, { status: 400 })
    }

    const staff = await prisma.staff.findFirst({ where: { userId: session.user.id } })

    const tx = await prisma.$transaction(async (txc) => {
      const existing = await txc.paymentTransaction.findUnique({
        where:  { id },
        select: { id: true, status: true, bookingId: true, booking: { select: { status: true } } },
      })
      if (!existing) throw new Error("NOT_FOUND")
      
      if (existing.status === "PAID" || existing.status === "FAILED") {
        throw new Error("ALREADY_VERIFIED")
      }

      const updated = await txc.paymentTransaction.update({
        where: { id },
        data: {
          status:           status as PaymentStatus,
          reason:           status === "FAILED" ? trimmedReason : null,
          verifiedById:     staff?.id ?? null,
          verifiedByUserId: session.user.id,
          verifiedAt:       new Date(),
        },
        include: {
          booking: {
            include: {
              user: { select: { email: true, name: true } },
            },
          },
        },
      })

      if (status === "PAID" && existing.booking.status === "PENDING") {
        await txc.booking.update({
          where: { id: existing.bookingId },
          data:  { status: "CONFIRMED", expiresAt: null },
        })
      }

      return updated
    })

    // ส่งอีเมลแบบสวยงาม (2 ภาษา + Sender Name เป็น Maison de Nongkhiaw)
    const customerEmail = tx.booking?.user?.email
    if (customerEmail) {
      const isPaid = tx.status === "PAID"
      const emailSubject = isPaid
        ? `Payment Confirmation / ການຢືນຢັນການຊໍາລະເງິນ (#${tx.bookingId})`
        : `Payment Status Update / ແຈ້ງສະຖານະການຊໍາລະເງິນ (#${tx.bookingId})`

      // สร้าง HTML จาก Template ที่ออกแบบไว้
      const emailContent = generatePaymentVerifyEmailHtml({
        customerName: tx.booking.user.name || '',
        bookingId: tx.bookingId,
        isPaid,
        reason: trimmedReason,
      })

      try {
        await sendNotificationEmail({
          to: customerEmail,
          subject: emailSubject,
          html: emailContent,
        });
      } catch (err) {
        console.error("[PAYMENT_VERIFY_EMAIL_ERROR]", err);
      }
    }

    try {
      broadcaster.send("notification", {
        type: "booking_update",
        data: {
          bookingId: tx.bookingId,
          message: tx.status === "PAID"
            ? "ການຈອງຖືກຢືນຢັນແລ້ວ"
            : "ການຊໍາລະເງິນບໍ່ຜ່ານການຢືນຢັນ",
        },
      })
    } catch (err) {
      console.error("Failed to broadcast payment verify update", err)
    }

    return NextResponse.json(tx)
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ບໍ່ພົບລາຍການຊຳລະ" }, { status: 404 })
    }
    if (error instanceof Error && error.message === "ALREADY_VERIFIED") {
      return NextResponse.json({ error: "ລາຍການນີ້ຖືກກວດສອບໄປແລ້ວ" }, { status: 409 })
    }
    console.error("[PAYMENTS_VERIFY]", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}