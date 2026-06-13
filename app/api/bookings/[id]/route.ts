import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// GET /api/bookings/[id] - booking detail only.
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, lastName: true, email: true, phone: true } },
        room: { select: { id: true, name: true, roomNumber: true, images: true, view: true, bedType: true } },
        transactions: { orderBy: { createdAt: "desc" } },
        approval: true,
        cancelRequest: true,
        review: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const canAccess =
      booking.userId === session.user.id ||
      session.user.role === "ADMIN" ||
      session.user.role === "SUPERADMIN"

    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      ...booking,
      totalPrice: Number(booking.totalPrice),
      transactions: booking.transactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      })),
      room: {
        ...booking.room,
        images: safeJson(booking.room.images, []),
      },
    })
  } catch (error) {
    console.error("[BOOKINGS_GET_ID]", error)
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 })
  }
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}
