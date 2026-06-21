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
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { status } = await request.json()
    if (!["PAID", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "status ຕ້ອງເປັນ PAID ຫຼື FAILED" }, { status: 400 })
    }

    const staff = await prisma.staff.findFirst({ where: { userId: session.user.id } })

    const tx = await prisma.paymentTransaction.update({
      where: { id },
      data: {
        status:      status as PaymentStatus,
        verifiedById: staff?.id ?? null,
      },
      include: { booking: { select: { id: true, status: true } } },
    })

    // ถ้า PAID → auto confirm booking ถ้ายัง PENDING
    if (status === "PAID" && tx.booking.status === "PENDING") {
      await prisma.booking.update({
        where: { id: tx.booking.id },
        data:  { status: "CONFIRMED" },
      })
    }

    return NextResponse.json(tx)
  } catch (error) {
    console.error("[PAYMENTS_VERIFY]", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
