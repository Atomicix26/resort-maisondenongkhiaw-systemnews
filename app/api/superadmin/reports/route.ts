import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function readRange(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const now = startOfDay(new Date())
  const defaultFrom = addDays(now, -30)
  const from = new Date(searchParams.get("from") ?? defaultFrom)
  const to = new Date(searchParams.get("to") ?? now)

  const safeFrom = Number.isNaN(from.getTime()) ? defaultFrom : startOfDay(from)
  const safeTo = Number.isNaN(to.getTime()) ? now : startOfDay(to)
  return { from: safeFrom, to: addDays(safeTo, 1) }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { from, to } = readRange(request)

    const [bookings, paidPayments, bookingStatus, paymentStatus, roomStatus, users, staffCount] = await Promise.all([
      prisma.booking.findMany({
        where: { deletedAt: null, createdAt: { gte: from, lt: to } },
        select: {
          id: true,
          status: true,
          totalPrice: true,
          createdAt: true,
          room: { select: { id: true, name: true, roomNumber: true } },
        },
      }),
      prisma.paymentTransaction.findMany({
        where: { status: "PAID", createdAt: { gte: from, lt: to } },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { deletedAt: null, createdAt: { gte: from, lt: to } },
        _count: { id: true },
      }),
      prisma.paymentTransaction.groupBy({
        by: ["status"],
        where: { createdAt: { gte: from, lt: to } },
        _count: { id: true },
      }),
      prisma.room.groupBy({
        by: ["status"],
        where: { deletedAt: null, isActive: true },
        _count: { id: true },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.staff.count({ where: { isActive: true } }),
    ])

    const revenue = paidPayments.reduce((sum, item) => sum + Number(item.amount), 0)
    const topRooms = Object.values(bookings.reduce<Record<string, {
      roomId: string
      roomName: string
      bookings: number
      revenue: number
    }>>((acc, booking) => {
      const key = booking.room.id
      acc[key] ??= {
        roomId: key,
        roomName: booking.room.roomNumber ? `${booking.room.roomNumber} - ${booking.room.name}` : booking.room.name,
        bookings: 0,
        revenue: 0,
      }
      acc[key].bookings += 1
      acc[key].revenue += Number(booking.totalPrice)
      return acc
    }, {})).sort((a, b) => b.bookings - a.bookings).slice(0, 8)

    const dailyRevenue = Object.values(paidPayments.reduce<Record<string, { date: string; revenue: number }>>((acc, item) => {
      const date = item.createdAt.toISOString().slice(0, 10)
      acc[date] ??= { date, revenue: 0 }
      acc[date].revenue += Number(item.amount)
      return acc
    }, {}))

    return NextResponse.json({
      range: { from: from.toISOString(), to: addDays(to, -1).toISOString() },
      summary: {
        totalBookings: bookings.length,
        totalRevenue: revenue,
        averageBookingValue: bookings.length ? revenue / bookings.length : 0,
        totalUsers: users,
        totalStaff: staffCount,
      },
      bookingStatus: bookingStatus.map((item) => ({ status: item.status, count: item._count.id })),
      paymentStatus: paymentStatus.map((item) => ({ status: item.status, count: item._count.id })),
      roomStatus: roomStatus.map((item) => ({ status: item.status, count: item._count.id })),
      topRooms,
      dailyRevenue,
    })
  } catch (error) {
    console.error("[SUPERADMIN_REPORTS_GET]", error)
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
  }
}
