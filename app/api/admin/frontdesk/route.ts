import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"

// GET /api/admin/frontdesk?date=YYYY-MM-DD — worklist หน้าเคาน์เตอร์
//   arrivals = CONFIRMED ที่ check-in ตรงวันที่เลือก (พร้อม check-in)
//   inHouse  = CHECKED_IN ทั้งหมด (แขกที่พักอยู่) + flag dueOut ถ้าถึงกำหนดออก
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasRole(session.user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10)
    const dayStart = new Date(`${dateStr}T00:00:00`)
    const dayEnd = new Date(dayStart.getTime() + 86400000)

    const select = {
      id: true, checkIn: true, checkOut: true, guests: true, totalPrice: true, status: true,
      user: { select: { name: true, lastName: true, email: true, phone: true } },
      room: { select: { name: true, roomNumber: true } },
      transactions: {
        where:   { type: "CHARGE" as const },
        orderBy: { createdAt: "desc" as const },
        take:    1,
        select:  { method: true, status: true, amount: true },
      },
    }

    const [arrivalsRaw, inHouseRaw] = await Promise.all([
      prisma.booking.findMany({
        where:   { deletedAt: null, status: "CONFIRMED", checkIn: { gte: dayStart, lt: dayEnd } },
        orderBy: { checkIn: "asc" },
        select,
      }),
      prisma.booking.findMany({
        where:   { deletedAt: null, status: "CHECKED_IN" },
        orderBy: { checkOut: "asc" },
        select,
      }),
    ])

    const shape = (b: (typeof arrivalsRaw)[number]) => {
      const charge = b.transactions[0] ?? null
      return {
        id:         b.id,
        guest:      [b.user.name, b.user.lastName].filter(Boolean).join(" ") || b.user.email,
        email:      b.user.email,
        phone:      b.user.phone ?? "",
        room:       b.room?.name ?? "-",
        roomNumber: b.room?.roomNumber ?? null,
        checkIn:    b.checkIn.toISOString(),
        checkOut:   b.checkOut.toISOString(),
        guests:     b.guests,
        totalPrice: Number(b.totalPrice),
        // จ่ายที่โรงแรม (CASH) ที่ยังไม่จ่าย → ต้องเก็บเงินสดตอน check-in
        payAtHotel: charge?.method === "CASH" && charge?.status === "PENDING",
        paid:       charge?.status === "PAID",
      }
    }

    return NextResponse.json({
      date:     dateStr,
      arrivals: arrivalsRaw.map(shape),
      inHouse:  inHouseRaw.map((b) => ({ ...shape(b), dueOut: b.checkOut < dayEnd })),
    })
  } catch (error) {
    console.error("[ADMIN_FRONTDESK_GET]", error)
    return NextResponse.json({ error: "Failed to load front desk" }, { status: 500 })
  }
}
