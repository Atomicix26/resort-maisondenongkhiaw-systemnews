import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/superadmin/logs
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const [logs, stats] = await Promise.all([
      prisma.accessLog.findMany({
        orderBy: { loginTime: "desc" },
        take: 100,
        include: { user: { select: { name: true, lastName: true, email: true, role: true } } },
      }),
      prisma.accessLog.groupBy({
        by:      ["userType"],
        _count:  { id: true },
      }),
    ])

    return NextResponse.json({ logs, stats })
  } catch (error) {
    console.error("[SUPERADMIN_LOGS]", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}