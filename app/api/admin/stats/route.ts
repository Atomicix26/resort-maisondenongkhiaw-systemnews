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

    // "Today"/"this month" in Laos time (Asia/Vientiane = UTC+7, no DST), independent of server TZ
    const LAO_OFFSET_MS = 7 * 60 * 60 * 1000
    const nowLao = new Date(Date.now() + LAO_OFFSET_MS)
    const todayStart = new Date(Date.UTC(nowLao.getUTCFullYear(), nowLao.getUTCMonth(), nowLao.getUTCDate()) - LAO_OFFSET_MS)
    const todayEnd = new Date(todayStart.getTime() + 86400000)
    const thisMonthStart = new Date(Date.UTC(nowLao.getUTCFullYear(), nowLao.getUTCMonth(), 1) - LAO_OFFSET_MS)

    const [
      totalRooms,
      availableRooms,
      occupiedRooms,
      maintenanceRooms,
      reservedRooms,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      checkedInBookings,
      completedBookings,
      cancelledBookings,
      checkedOutBookings,
      noShowBookings,
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
      prisma.room.count({ where: { isActive: true, deletedAt: null, status: "RESERVED" } }),

      prisma.booking.count({ where: { deletedAt: null } }),
      prisma.booking.count({ where: { deletedAt: null, status: "PENDING" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "CONFIRMED" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "CHECKED_IN" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "COMPLETED" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "CANCELLED" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "CHECKED_OUT" } }),
      prisma.booking.count({ where: { deletedAt: null, status: "NO_SHOW" } }),

      // Check-in ວັນນີ້ = arrivals ທີ່ຄວນ check-in ມື້ນີ້ (ບໍ່ນັບ CANCELLED / NO_SHOW / PENDING)
      prisma.booking.count({
        where: {
          deletedAt: null,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          checkIn: { gte: todayStart, lt: todayEnd },
        },
      }),
      // Check-out ວັນນີ້ = departures ທີ່ຄວນ check-out ມື້ນີ້ (ນັບຄົນທີ່ຍັງພັກ/ອອກແລ້ວມື້ນີ້)
      prisma.booking.count({
        where: {
          deletedAt: null,
          status: { in: ["CHECKED_IN", "CHECKED_OUT", "COMPLETED"] },
          checkOut: { gte: todayStart, lt: todayEnd },
        },
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
      rooms: { total: totalRooms, available: availableRooms, occupied: occupiedRooms, maintenance: maintenanceRooms, reserved: reservedRooms },
      bookings: {
        total: totalBookings, pending: pendingBookings, confirmed: confirmedBookings,
        checkedIn: checkedInBookings, checkedOut: checkedOutBookings, completed: completedBookings,
        cancelled: cancelledBookings, noShow: noShowBookings,
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