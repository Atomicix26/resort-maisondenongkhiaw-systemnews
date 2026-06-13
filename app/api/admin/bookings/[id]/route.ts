import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BookingStatus, RoomStatus } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

// PATCH /api/admin/bookings/[id] — เปลี่ยน status + check-in/out
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { status, actualCheckIn, actualCheckOut, checkInRemarks, checkOutRemarks } = await request.json()

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { room: true },
    })
    if (!booking) return NextResponse.json({ error: "ບໍ່ພົບ booking" }, { status: 404 })

    // State machine validation
    const TRANSITIONS: Record<string, BookingStatus[]> = {
      PENDING:     ["CONFIRMED", "CANCELLED"],
      CONFIRMED:   ["CHECKED_IN", "CANCELLED"],
      CHECKED_IN:  ["CHECKED_OUT"],
      CHECKED_OUT: ["COMPLETED"],
      COMPLETED:   [],
      CANCELLED:   [],
    }
    if (status && !TRANSITIONS[booking.status]?.includes(status as BookingStatus)) {
      return NextResponse.json(
        { error: `ປ່ຽນ status ຈາກ ${booking.status} → ${status} ບໍ່ໄດ້` },
        { status: 400 }
      )
    }

    const staff = await prisma.staff.findFirst({ where: { userId: session.user.id } })

    const updated = await prisma.$transaction(async (tx) => {
      // อัปเดต Booking
      const b = await tx.booking.update({
        where: { id },
        data: {
          ...(status         && { status: status as BookingStatus }),
          ...(actualCheckIn  && { actualCheckIn: new Date(actualCheckIn) }),
          ...(actualCheckOut && { actualCheckOut: new Date(actualCheckOut) }),
        },
        include: {
          user:         { select: { name: true, lastName: true, email: true } },
          room:         { select: { name: true, roomNumber: true } },
          transactions: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      })

      // Log check-in
      if (actualCheckIn && staff) {
        await tx.checkInLog.create({
          data: { bookingId: id, staffId: staff.id, actualTime: new Date(actualCheckIn), remarks: checkInRemarks },
        })
      }
      // Log check-out
      if (actualCheckOut && staff) {
        await tx.checkOutLog.create({
          data: { bookingId: id, staffId: staff.id, actualTime: new Date(actualCheckOut), remarks: checkOutRemarks },
        })
      }

      // เปลี่ยนสถานะห้องตาม booking status
      if (status === "CHECKED_IN") {
        await tx.room.update({ where: { id: booking.roomId }, data: { status: RoomStatus.OCCUPIED } })
        await tx.statusRoom.create({
          data: { roomId: booking.roomId, staffId: staff?.id, oldStatus: booking.room.status, newStatus: RoomStatus.OCCUPIED },
        })
      } else if (status === "CHECKED_OUT" || status === "CANCELLED") {
        await tx.room.update({ where: { id: booking.roomId }, data: { status: RoomStatus.AVAILABLE } })
        await tx.statusRoom.create({
          data: { roomId: booking.roomId, staffId: staff?.id, oldStatus: RoomStatus.OCCUPIED, newStatus: RoomStatus.AVAILABLE },
        })
      }

      // อัปเดต BookApproval ถ้ามี
      if (status === "CONFIRMED" || status === "CANCELLED") {
        await tx.bookApproval.upsert({
          where:  { bookingId: id },
          create: { bookingId: id, staffId: staff?.id, status: status === "CONFIRMED" ? "APPROVED" : "REJECTED", apprDate: new Date() },
          update: { staffId: staff?.id, status: status === "CONFIRMED" ? "APPROVED" : "REJECTED", apprDate: new Date() },
        })
      }

      return b
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[ADMIN_BOOKINGS_PATCH]", error)
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
  }
}
