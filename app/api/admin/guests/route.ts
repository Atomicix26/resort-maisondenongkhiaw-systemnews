import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"

// GET /api/admin/guests — รายชื่อแขก (role USER) พร้อมสถิติจากการจอง
//  ประวัติ · ยอดใช้จ่าย · จำนวน no-show (นับสดจาก Booking.status=NO_SHOW, ไม่มี field เก็บ)
//  ใช้หน้าเคาน์เตอร์ประกอบการตัดสินตอน check-in
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasRole(session.user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const users = await prisma.user.findMany({
      where:   { role: "USER", deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, lastName: true, email: true, phone: true, createdAt: true,
        bookings: {
          select: {
            status: true, checkIn: true, checkOut: true,
            // เฉพาะเงินที่จ่ายจริง (CHARGE ที่ PAID) → ยอดใช้จ่ายสุทธิ
            transactions: {
              where:  { type: "CHARGE", status: "PAID" },
              select: { amount: true },
            },
          },
        },
      },
    })

    const data = users.map((u) => {
      const b = u.bookings
      const stayed = b.filter((x) => x.status === "CHECKED_OUT" || x.status === "COMPLETED" || x.status === "CHECKED_IN")
      const spent = b.reduce((sum, x) => sum + x.transactions.reduce((s, t) => s + Number(t.amount), 0), 0)
      const lastStay = stayed
        .map((x) => x.checkOut.getTime())
        .reduce((max, t) => (t > max ? t : max), 0)
      return {
        id:         u.id,
        name:       [u.name, u.lastName].filter(Boolean).join(" ") || u.email,
        email:      u.email,
        phone:      u.phone ?? "",
        joined:     u.createdAt.toISOString(),
        bookings:   b.length,
        stays:      stayed.length,
        noShow:     b.filter((x) => x.status === "NO_SHOW").length,
        cancelled:  b.filter((x) => x.status === "CANCELLED").length,
        spent,
        lastStay:   lastStay > 0 ? new Date(lastStay).toISOString() : null,
      }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("[ADMIN_GUESTS_GET]", error)
    return NextResponse.json({ error: "Failed to load guests" }, { status: 500 })
  }
}
