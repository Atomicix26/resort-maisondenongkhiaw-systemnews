import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"

// GET /api/admin/reviews — ดึงทุก review พร้อม management status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasRole(session.user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const rows = await prisma.review.findMany({
      where:   { deletedAt: null },
      include: {
        booking: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            status: true,
            user: { select: { name: true, lastName: true } },
            room: { select: { name: true } },
          },
        },
        management: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const reviews = rows.map((review) => ({
      ...review,
      user: review.booking.user,
      room: review.booking.room,
    }))

    return NextResponse.json(reviews)
  } catch (error) {
    console.error("Admin reviews error:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
