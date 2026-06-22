import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PaymentStatus } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

// PATCH /api/admin/payments/[id]/verify
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // allowlist: เฉพาะ ADMIN / SUPERADMIN เท่านั้น (ไม่ใช้ denylist)
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { status, reason } = await request.json()
    if (!["PAID", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "status ຕ້ອງເປັນ PAID ຫຼື FAILED" }, { status: 400 })
    }

    // ปฏิเสธ (FAILED) ต้องระบุเหตุผล — audit trail (BUG-002)
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
      // กัน verify ซ้ำรายการที่ตัดสินไปแล้ว
      if (existing.status === "PAID" || existing.status === "FAILED") {
        throw new Error("ALREADY_VERIFIED")
      }

      const updated = await txc.paymentTransaction.update({
        where: { id },
        data: {
          status:           status as PaymentStatus,
          reason:           status === "FAILED" ? trimmedReason : null,
          verifiedById:     staff?.id ?? null,
          verifiedByUserId: session.user.id,   // actor เสมอ แม้ไม่มี Staff profile
          verifiedAt:       new Date(),
        },
        include: { booking: { select: { id: true, status: true } } },
      })

      // ถ้า PAID → auto confirm booking ถ้ายัง PENDING (อยู่ใน transaction เดียวกัน)
      if (status === "PAID" && existing.booking.status === "PENDING") {
        await txc.booking.update({
          where: { id: existing.bookingId },
          data:  { status: "CONFIRMED" },
        })
      }

      return updated
    })

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
