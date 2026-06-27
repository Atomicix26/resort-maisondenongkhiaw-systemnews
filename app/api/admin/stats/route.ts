import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasRole(session.user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const now   = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalRooms,
      availableRooms,
      occupiedRooms,
      maintenanceRooms,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      checkedInBookings,
      completedBookings,
      cancelledBookings,
      todayCheckIns,
      todayCheckOuts,
      pendingPayments,
      monthRevenue,
      totalRevenue,
      pendingReviews,
      totalStaff,
      totalUsers,
      recentBookings,
    ] = await Promise.all([
      prisma.room.count({ where: { isActive: true, deletedAt: null } }),
      prisma.room.count({ where: { isActive: true, deletedAt: null, status: "AVAILABLE" } }),
      prisma.room.count({ where: { isActive: true, deletedAt: null, status: "OCCUPIED" } }),
      prisma.room.count({ where: { isActive: true, deletedAt: null, status: "MAINTENANCE" } }),

      prisma.booking.count({ where: { deletedAt: null } }),
      prisma.booking.count({ where: { deletedAt: null, status: "PENDING" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "CONFIRMED" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "CHECKED_IN" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "COMPLETED" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "CANCELLED" } }),

      prisma.booking.count({
        where: { deletedAt: null, checkIn: { gte: today, lt: new Date(today.getTime() + 86400000) } },
      }),
      prisma.booking.count({
        where: { deletedAt: null, checkOut: { gte: today, lt: new Date(today.getTime() + 86400000) } },
      }),

      prisma.paymentTransaction.count({ where: { status: "PENDING_VERIFY" } }),

      prisma.paymentTransaction.aggregate({
        where: { status: "PAID", createdAt: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.paymentTransaction.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),

      prisma.reviewManage.count({ where: { status: "PENDING" } }),
      prisma.staff.count({ where: { isActive: true } }),
      prisma.user.count({ where: { deletedAt: null, role: "USER" } }),

      prisma.booking.findMany({
        where:   { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take:    6,
        include: {
          user: { select: { name: true, lastName: true, email: true } },
          room: { select: { name: true } },
          transactions: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
    ])

    return NextResponse.json({
      rooms: { total: totalRooms, available: availableRooms, occupied: occupiedRooms, maintenance: maintenanceRooms },
      bookings: {
        total: totalBookings, pending: pendingBookings, confirmed: confirmedBookings,
        checkedIn: checkedInBookings, completed: completedBookings, cancelled: cancelledBookings,
        todayCheckIns, todayCheckOuts,
      },
      payments: {
        pendingVerify: pendingPayments,
        monthRevenue:  Number(monthRevenue._sum.amount  ?? 0),
        totalRevenue:  Number(totalRevenue._sum.amount  ?? 0),
      },
      misc:     { pendingReviews, totalStaff, totalUsers },
      recentBookings,
    })
  } catch (error) {
    console.error("[ADMIN_STATS]", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}