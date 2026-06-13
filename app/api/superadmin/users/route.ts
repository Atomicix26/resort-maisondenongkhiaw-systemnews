import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

// GET /api/superadmin/users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") ?? ""
    const role   = searchParams.get("role")

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(role && role !== "ALL" ? { role: role as Role } : {}),
        ...(search ? {
          OR: [
            { name:     { contains: search } },
            { lastName: { contains: search } },
            { email:    { contains: search } },
          ],
        } : {}),
      },
      select: {
        id: true, name: true, lastName: true,
        email: true, phone: true, role: true,
        createdAt: true, deletedAt: true,
        staff:    { select: { id: true, position: true, role: true, isActive: true } },
        _count:   { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const reviewCounts = await prisma.$queryRaw<Array<{ userId: string; count: bigint }>>`
      SELECT b.userId, COUNT(r.id) AS count
      FROM reviews r
      INNER JOIN bookings b ON b.id = r.bookingId
      WHERE r.deletedAt IS NULL
      GROUP BY b.userId
    `
    const reviewsByUser = new Map(reviewCounts.map((row) => [row.userId, Number(row.count)]))

    return NextResponse.json(users.map((user) => ({
      ...user,
      _count: { ...user._count, reviews: reviewsByUser.get(user.id) ?? 0 },
    })))
  } catch (error) {
    console.error("[SUPERADMIN_USERS_GET]", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
