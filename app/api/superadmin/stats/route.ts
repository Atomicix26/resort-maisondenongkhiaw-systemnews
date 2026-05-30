import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/superadmin/stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const [totalUsers, totalAdmins, totalStaff, totalRooms,
           totalBookings, totalRevenue, recentLogs] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, role: "USER" } }),
      prisma.user.count({ where: { deletedAt: null, role: "ADMIN" } }),
      prisma.staff.count({ where: { isActive: true } }),
      prisma.room.count({ where: { deletedAt: null, isActive: true } }),
      prisma.booking.count({ where: { deletedAt: null } }),
      prisma.paymentTransaction.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
      prisma.accessLog.findMany({
        orderBy: { loginTime: "desc" }, take: 10,
        include: { user: { select: { name: true, lastName: true, email: true, role: true } } },
      }),
    ])

    return NextResponse.json({
      totalUsers, totalAdmins, totalStaff, totalRooms,
      totalBookings,
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      recentLogs,
    })
  } catch (error) {
    console.error("[SUPERADMIN_STATS]", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}