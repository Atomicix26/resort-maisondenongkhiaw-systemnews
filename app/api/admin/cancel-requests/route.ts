import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"
import { CancelStatus, Prisma } from "@prisma/client"

// GET /api/admin/cancel-requests — รายการคำขอยกเลิก/คืนเงินทั้งหมด
//  พร้อม booking/user/room + สถานะ REFUND transaction (รู้ว่าโอนคืนแล้วยัง)
//  ?status=PENDING|APPROVED|REJECTED (ไม่ใส่ = ทั้งหมด)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasRole(session.user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const rows = await prisma.cancelRequest.findMany({
      where: status && status !== "ALL" ? { status: status as CancelStatus } : {},
      orderBy: [{ status: "asc" }, { requestDate: "desc" }],
      include: {
        user:    { select: { name: true, lastName: true, email: true, phone: true } },
        booking: {
          select: {
            id: true, checkIn: true, checkOut: true, totalPrice: true, status: true,
            room: { select: { name: true, roomNumber: true } },
            // REFUND transaction ล่าสุด — ดูว่าโอนคืนแล้ว (PAID) หรือรอโอน (PENDING)
            transactions: {
              where:   { type: "REFUND" },
              orderBy: { createdAt: "desc" },
              take:    1,
              select:  { id: true, status: true, amount: true, slipImage: true },
            },
          },
        },
      },
    })

    const qrRows = rows.length
      ? await prisma.$queryRaw<Array<{ id: string; refundQrImage: string | null }>>`
          SELECT id, refundQrImage
          FROM cancel_requests
          WHERE id IN (${Prisma.join(rows.map((r) => r.id))})
        `
      : []
    const qrById = new Map(qrRows.map((row) => [row.id, row.refundQrImage ?? ""]))

    const data = rows.map((r) => {
      const refundTx = r.booking.transactions[0] ?? null
      return {
        id:            r.id,
        status:        r.status,
        reason:        r.reason,
        refundable:    r.refundable,
        refundPercent: r.refundPercent,
        refundAmount:  r.refundAmount ? Number(r.refundAmount) : 0,
        bank: {
          name:   r.refundBankName ?? "",
          holder: r.refundAccountName ?? "",
          number: r.refundAccountNumber ?? "",
        },
        refundQrImage: qrById.get(r.id) ?? "",
        requestDate: r.requestDate.toISOString(),
        actionDate:  r.actionDate ? r.actionDate.toISOString() : null,
        guest:  [r.user.name, r.user.lastName].filter(Boolean).join(" ") || r.user.email,
        email:  r.user.email,
        phone:  r.user.phone ?? "",
        booking: {
          id:         r.booking.id,
          room:       r.booking.room?.name ?? "-",
          roomNumber: r.booking.room?.roomNumber ?? null,
          checkIn:    r.booking.checkIn.toISOString(),
          checkOut:   r.booking.checkOut.toISOString(),
          totalPrice: Number(r.booking.totalPrice),
          status:     r.booking.status,
        },
        refund: refundTx
          ? { id: refundTx.id, status: refundTx.status, amount: Number(refundTx.amount), hasSlip: !!refundTx.slipImage, slipImage: refundTx.slipImage ?? "" }
          : null,
      }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("[ADMIN_CANCEL_REQUESTS_GET]", error)
    return NextResponse.json({ error: "Failed to load cancel requests" }, { status: 500 })
  }
}
