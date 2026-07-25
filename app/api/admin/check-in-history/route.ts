import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"
import { Prisma } from "@prisma/client"

type HistoryRow = {
  id: string
  bookingId: string
  action: "CHECK_IN" | "CHECK_OUT"
  timestamp: Date
  note: string | null
  guest: string
  email: string
  room: string
  roomNumber: string | null
  adminId: string | null
  adminName: string | null
  adminEmail: string | null
}

const adminNameSql = (performedAlias: string, staffUserAlias: string) => `
  COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(${performedAlias}.name, ''), ' ', COALESCE(${performedAlias}.lastName, ''))), ''),
    ${performedAlias}.email,
    ${performedAlias}.id,
    NULLIF(TRIM(CONCAT(COALESCE(${staffUserAlias}.name, ''), ' ', COALESCE(${staffUserAlias}.lastName, ''))), ''),
    ${staffUserAlias}.email,
    ${staffUserAlias}.id
  )
`

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasRole(session.user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")
    const from = fromParam ? new Date(`${fromParam}T00:00:00`) : null
    const to = toParam ? new Date(`${toParam}T23:59:59.999`) : null

    const rows = await prisma.$queryRaw<HistoryRow[]>(Prisma.sql`
      SELECT
        l.id,
        b.id AS bookingId,
        'CHECK_IN' AS action,
        l.actualTime AS timestamp,
        l.remarks AS note,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.lastName, ''))), ''), u.email) AS guest,
        u.email,
        COALESCE(r.name, '-') AS room,
        r.roomNumber,
        COALESCE(pu.id, su.id, p2u.id, s2u.id) AS adminId,
        COALESCE(${Prisma.raw(adminNameSql("pu", "su"))}, ${Prisma.raw(adminNameSql("p2u", "s2u"))}) AS adminName,
        COALESCE(pu.email, su.email, p2u.email, s2u.email, pu.id, su.id, p2u.id, s2u.id) AS adminEmail
      FROM check_in_logs l
      INNER JOIN bookings b ON b.id = l.bookingId
      INNER JOIN users u ON u.id = b.userId
      LEFT JOIN rooms r ON r.id = b.roomId
      LEFT JOIN users pu ON pu.id = l.performedByUserId
      LEFT JOIN staff s ON s.id = l.staffId
      LEFT JOIN users su ON su.id = s.userId
      LEFT JOIN check_out_logs paired2 ON paired2.bookingId = b.id
      LEFT JOIN users p2u ON p2u.id = paired2.performedByUserId
      LEFT JOIN staff s2 ON s2.id = paired2.staffId
      LEFT JOIN users s2u ON s2u.id = s2.userId
      WHERE (${from} IS NULL OR l.actualTime >= ${from})
        AND (${to} IS NULL OR l.actualTime <= ${to})

      UNION ALL

      SELECT
        CONCAT(b.id, '-actual-check-in') AS id,
        b.id AS bookingId,
        'CHECK_IN' AS action,
        b.actualCheckIn AS timestamp,
        'Imported from booking actual check-in time; original admin log is missing.' AS note,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.lastName, ''))), ''), u.email) AS guest,
        u.email,
        COALESCE(r.name, '-') AS room,
        r.roomNumber,
        COALESCE(pu.id, su.id) AS adminId,
        ${Prisma.raw(adminNameSql("pu", "su"))} AS adminName,
        COALESCE(pu.email, su.email, pu.id, su.id) AS adminEmail
      FROM bookings b
      INNER JOIN users u ON u.id = b.userId
      LEFT JOIN rooms r ON r.id = b.roomId
      LEFT JOIN check_out_logs paired ON paired.bookingId = b.id
      LEFT JOIN users pu ON pu.id = paired.performedByUserId
      LEFT JOIN staff s ON s.id = paired.staffId
      LEFT JOIN users su ON su.id = s.userId
      WHERE b.actualCheckIn IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM check_in_logs l2 WHERE l2.bookingId = b.id)
        AND (${from} IS NULL OR b.actualCheckIn >= ${from})
        AND (${to} IS NULL OR b.actualCheckIn <= ${to})

      UNION ALL

      SELECT
        l.id,
        b.id AS bookingId,
        'CHECK_OUT' AS action,
        l.actualTime AS timestamp,
        l.remarks AS note,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.lastName, ''))), ''), u.email) AS guest,
        u.email,
        COALESCE(r.name, '-') AS room,
        r.roomNumber,
        COALESCE(pu.id, su.id, p2u.id, s2u.id) AS adminId,
        COALESCE(${Prisma.raw(adminNameSql("pu", "su"))}, ${Prisma.raw(adminNameSql("p2u", "s2u"))}) AS adminName,
        COALESCE(pu.email, su.email, p2u.email, s2u.email, pu.id, su.id, p2u.id, s2u.id) AS adminEmail
      FROM check_out_logs l
      INNER JOIN bookings b ON b.id = l.bookingId
      INNER JOIN users u ON u.id = b.userId
      LEFT JOIN rooms r ON r.id = b.roomId
      LEFT JOIN users pu ON pu.id = l.performedByUserId
      LEFT JOIN staff s ON s.id = l.staffId
      LEFT JOIN users su ON su.id = s.userId
      LEFT JOIN check_in_logs paired2 ON paired2.bookingId = b.id
      LEFT JOIN users p2u ON p2u.id = paired2.performedByUserId
      LEFT JOIN staff s2 ON s2.id = paired2.staffId
      LEFT JOIN users s2u ON s2u.id = s2.userId
      WHERE (${from} IS NULL OR l.actualTime >= ${from})
        AND (${to} IS NULL OR l.actualTime <= ${to})

      UNION ALL

      SELECT
        CONCAT(b.id, '-actual-check-out') AS id,
        b.id AS bookingId,
        'CHECK_OUT' AS action,
        b.actualCheckOut AS timestamp,
        'Imported from booking actual check-out time; original admin log is missing.' AS note,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.lastName, ''))), ''), u.email) AS guest,
        u.email,
        COALESCE(r.name, '-') AS room,
        r.roomNumber,
        COALESCE(pu.id, su.id) AS adminId,
        ${Prisma.raw(adminNameSql("pu", "su"))} AS adminName,
        COALESCE(pu.email, su.email, pu.id, su.id) AS adminEmail
      FROM bookings b
      INNER JOIN users u ON u.id = b.userId
      LEFT JOIN rooms r ON r.id = b.roomId
      LEFT JOIN check_in_logs paired ON paired.bookingId = b.id
      LEFT JOIN users pu ON pu.id = paired.performedByUserId
      LEFT JOIN staff s ON s.id = paired.staffId
      LEFT JOIN users su ON su.id = s.userId
      WHERE b.actualCheckOut IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM check_out_logs l2 WHERE l2.bookingId = b.id)
        AND (${from} IS NULL OR b.actualCheckOut >= ${from})
        AND (${to} IS NULL OR b.actualCheckOut <= ${to})

      ORDER BY timestamp DESC
      LIMIT 200
    `)

    return NextResponse.json(rows.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp).toISOString(),
      guest: row.guest?.trim() || row.email,
      adminName: row.adminName?.trim() || row.adminEmail || "Admin not recorded",
    })))
  } catch (error) {
    console.error("[ADMIN_CHECK_IN_HISTORY_GET]", error)
    return NextResponse.json({ error: "Failed to load check-in/out history" }, { status: 500 })
  }
}
