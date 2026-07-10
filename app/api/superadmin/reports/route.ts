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

    const [
      bookings, paidPayments, bookingStatus, paymentStatus, paymentMethodRows, roomStatus, users, staffCount,
      customerRows, staffRows, reviewRows, cancelRows, checkInRows, stayBookings,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: { deletedAt: null, createdAt: { gte: from, lt: to } },
        select: {
          id: true,
          status: true,
          totalPrice: true,
          createdAt: true,
          checkIn: true,
          checkOut: true,
          guests: true,
          room: { select: { id: true, name: true, roomNumber: true } },
          user: { select: { name: true, lastName: true, email: true } },
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
      // ── ຊ່ອງທາງຊຳລະ (method: TRANSFER / CASH / CREDIT_CARD) + ຍอດรวม ──
      prisma.paymentTransaction.groupBy({
        by: ["method"],
        where: { status: "PAID", createdAt: { gte: from, lt: to } },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.room.groupBy({
        by: ["status"],
        where: { deletedAt: null, isActive: true },
        _count: { id: true },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.staff.count({ where: { isActive: true } }),

      // ── ລູກຄ້າ (surface User.phone, createdAt + ຈຳນວນຈອງ/ຍอดໃຊ້ຈ່າຍ) ──
      prisma.user.findMany({
        where: { role: "USER", deletedAt: null },
        select: {
          id: true, name: true, lastName: true, email: true, phone: true, createdAt: true,
          bookings: { where: { deletedAt: null }, select: { totalPrice: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // ── ພະນັກງານ (surface Staff.position, salary, startDate, role) ──
      prisma.staff.findMany({
        select: {
          id: true, position: true, role: true, salary: true, startDate: true, isActive: true,
          user: { select: { name: true, lastName: true, email: true, phone: true } },
        },
        orderBy: { startDate: "asc" },
      }),
      // ── ຣີວິວ (surface Review.rating/comment + ReviewManage.status/reply) ──
      prisma.review.findMany({
        where: { deletedAt: null, createdAt: { gte: from, lt: to } },
        select: {
          rating: true, comment: true, createdAt: true,
          booking: { select: { room: { select: { name: true, roomNumber: true } }, user: { select: { name: true, lastName: true } } } },
          management: { select: { status: true, reply: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // ── ການຍົກເລີກ (surface CancelRequest refund% / amount / bank fields) ──
      prisma.cancelRequest.findMany({
        where: { requestDate: { gte: from, lt: to } },
        select: {
          reason: true, status: true, refundable: true,
          refundPercent: true, refundAmount: true,
          refundBankName: true, refundAccountName: true, refundAccountNumber: true,
          requestDate: true, actionDate: true,
          booking: { select: { id: true, room: { select: { name: true } } } },
          user: { select: { name: true, lastName: true, email: true } },
        },
        orderBy: { requestDate: "desc" },
      }),
      // ── ການເຂົ້າພັກ (surface CheckInLog doc fields ທີ່ staff ເກັບຕອນ check-in) ──
      prisma.checkInLog.findMany({
        where: { actualTime: { gte: from, lt: to } },
        select: {
          actualTime: true, docType: true, docNumber: true, nationality: true, docExpiry: true,
          booking: { select: { id: true, room: { select: { name: true, roomNumber: true } }, user: { select: { name: true, lastName: true } } } },
          staff: { select: { user: { select: { name: true, lastName: true } } } },
        },
        orderBy: { actualTime: "desc" },
      }),
      // ── Occupancy: bookings ທີ່ການເຂົ້າพักทับซ้อนกับช่วง (ບໍ່ອິງ createdAt) ──
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"] },
          checkIn: { lt: to },
          checkOut: { gt: from },
        },
        select: { checkIn: true, checkOut: true },
      }),
    ])

    const revenue = paidPayments.reduce((sum, item) => sum + Number(item.amount), 0)

    // ── Booking statistics (aggregated) ─────────────────────────────
    const MS_PER_DAY = 86_400_000
    const bookingValueSum = bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0)
    const noShowCount = bookings.filter((b) => b.status === "NO_SHOW").length
    const cancelledCount = bookings.filter((b) => b.status === "CANCELLED").length
    const noShowRate = bookings.length ? (noShowCount / bookings.length) * 100 : 0
    const cancellationRate = bookings.length ? (cancelledCount / bookings.length) * 100 : 0

    // Occupancy (period): sum ຂອງคืนที่เข้าพักทับซ้อนกับช่วง ÷ (active rooms × days in range)
    // clamp แต่ละ booking ให้เหลือเฉพาะคืนที่อยู่ในช่วง [from, to) — กันการนับคืนนอกช่วง
    const totalActiveRooms = roomStatus.reduce((sum, r) => sum + r._count.id, 0)
    const rangeDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / MS_PER_DAY))
    const roomNights = stayBookings.reduce((sum, b) => {
      const start = Math.max(b.checkIn.getTime(), from.getTime())
      const end = Math.min(b.checkOut.getTime(), to.getTime())
      const nights = Math.round((end - start) / MS_PER_DAY)
      return nights > 0 ? sum + nights : sum
    }, 0)
    const capacity = totalActiveRooms * rangeDays
    const occupancyRate = capacity > 0 ? Math.min(100, (roomNights / capacity) * 100) : 0

    // Bookings per month (YYYY-MM) — for the trend chart
    const monthlyBookings = Object.values(bookings.reduce<Record<string, { month: string; count: number }>>((acc, b) => {
      const month = b.createdAt.toISOString().slice(0, 7)
      acc[month] ??= { month, count: 0 }
      acc[month].count += 1
      return acc
    }, {})).sort((a, b) => a.month.localeCompare(b.month))

    const paymentMethod = paymentMethodRows.map((m) => ({
      method: m.method,
      count: m._count.id,
      amount: Number(m._sum.amount ?? 0),
    }))
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

    const fullName = (p: { name: string | null; lastName?: string | null }) =>
      [p.name, p.lastName].filter(Boolean).join(" ") || "-"

    const customers = customerRows.map((u) => ({
      name: fullName(u),
      email: u.email,
      phone: u.phone ?? "-",
      createdAt: u.createdAt.toISOString(),
      bookings: u.bookings.length,
      spent: u.bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0),
    }))

    const staff = staffRows.map((s) => ({
      name: s.user ? fullName(s.user) : "-",
      email: s.user?.email ?? "-",
      phone: s.user?.phone ?? "-",
      position: s.position ?? "-",
      role: s.role,
      salary: s.salary ? Number(s.salary) : 0,
      startDate: s.startDate.toISOString(),
      isActive: s.isActive,
    }))

    const reviews = reviewRows.map((r) => ({
      date: r.createdAt.toISOString(),
      guest: fullName(r.booking.user),
      room: r.booking.room.roomNumber ? `${r.booking.room.roomNumber} - ${r.booking.room.name}` : r.booking.room.name,
      rating: r.rating,
      comment: r.comment ?? "-",
      status: r.management?.status ?? "PENDING",
      reply: r.management?.reply ?? "-",
    }))

    const cancellations = cancelRows.map((c) => ({
      date: c.requestDate.toISOString(),
      guest: fullName(c.user),
      email: c.user.email,
      room: c.booking.room.name,
      reason: c.reason,
      status: c.status,
      refundable: c.refundable,
      refundPercent: c.refundPercent ?? 0,
      refundAmount: c.refundAmount ? Number(c.refundAmount) : 0,
      bank: [c.refundBankName, c.refundAccountName, c.refundAccountNumber].filter(Boolean).join(" / ") || "-",
    }))

    // ── Booking list (row-level) — ตารางรายการจองรายตัว + filter/export ──
    const bookingList = bookings
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((b) => ({
        id: b.id,
        guest: fullName(b.user),
        email: b.user.email,
        room: b.room.roomNumber ? `${b.room.roomNumber} - ${b.room.name}` : b.room.name,
        checkIn: b.checkIn.toISOString(),
        checkOut: b.checkOut.toISOString(),
        guests: b.guests,
        status: b.status,
        totalPrice: Number(b.totalPrice),
        createdAt: b.createdAt.toISOString(),
      }))

    const checkIns = checkInRows.map((k) => ({
      time: k.actualTime.toISOString(),
      guest: fullName(k.booking.user),
      room: k.booking.room.roomNumber ? `${k.booking.room.roomNumber} - ${k.booking.room.name}` : k.booking.room.name,
      docType: k.docType ?? "-",
      docNumber: k.docNumber ?? "-",
      nationality: k.nationality ?? "-",
      docExpiry: k.docExpiry ? k.docExpiry.toISOString() : "-",
      staff: k.staff?.user ? fullName(k.staff.user) : "-",
    }))

    return NextResponse.json({
      range: { from: from.toISOString(), to: addDays(to, -1).toISOString() },
      summary: {
        totalBookings: bookings.length,
        totalRevenue: revenue,
        // เฉลี่ยมูลค่าการจอง (totalPrice) ไม่ใช่เงินที่จ่ายจริง — booking ที่ยังไม่จ่าย/no-show ก็นับมูลค่า
        averageBookingValue: bookings.length ? bookingValueSum / bookings.length : 0,
        occupancyRate,
        noShowRate,
        cancellationRate,
        totalUsers: users,
        totalStaff: staffCount,
      },
      bookingStatus: bookingStatus.map((item) => ({ status: item.status, count: item._count.id })),
      paymentStatus: paymentStatus.map((item) => ({ status: item.status, count: item._count.id })),
      paymentMethod,
      monthlyBookings,
      roomStatus: roomStatus.map((item) => ({ status: item.status, count: item._count.id })),
      topRooms,
      dailyRevenue,
      bookingList,
      customers,
      staff,
      reviews,
      cancellations,
      checkIns,
    })
  } catch (error) {
    console.error("[SUPERADMIN_REPORTS_GET]", error)
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
  }
}
