import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BookingStatus } from "@prisma/client"

// GET /api/admin/bookings — ดึงทุก booking พร้อม user/room/payment
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search") ?? ""
    const date   = searchParams.get("date")   // checkIn date filter

    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        ...(status && status !== "ALL" ? { status: status as BookingStatus } : {}),
        ...(date ? { checkIn: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86400000) } } : {}),
        ...(search ? {
          OR: [
            { user: { name:     { contains: search } } },
            { user: { lastName: { contains: search } } },
            { user: { email:    { contains: search } } },
            { room: { name:     { contains: search } } },
          ],
        } : {}),
      },
      include: {
        user:         { select: { id: true, name: true, lastName: true, email: true, phone: true } },
        room:         { select: { id: true, name: true, roomNumber: true } },
        transactions: { orderBy: { createdAt: "desc" }, take: 1 },
        approval:     true,
        cancelRequest:true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("[ADMIN_BOOKINGS_GET]", error)
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  }
}