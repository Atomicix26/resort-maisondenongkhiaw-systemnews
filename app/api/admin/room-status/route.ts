import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const rooms = await prisma.room.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        roomNumber: true,
        name: true,
        status: true,
        capacity: true,
        roomType: { select: { typeName: true } },
        statusLogs: {
          orderBy: { changedAt: "desc" },
          take: 1,
          select: { changedAt: true, oldStatus: true, newStatus: true },
        },
      },
      orderBy: [{ roomNumber: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(rooms)
  } catch (error) {
    console.error("[ADMIN_ROOM_STATUS_GET]", error)
    return NextResponse.json({ error: "Failed to fetch room status" }, { status: 500 })
  }
}
