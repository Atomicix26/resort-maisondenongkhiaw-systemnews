import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"
import { ReviewStatus } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

// PATCH /api/admin/reviews/[id] — อัปเดต status + reply
export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasRole(session.user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { status, reply } = await request.json()

    if (status !== undefined && !Object.values(ReviewStatus).includes(status as ReviewStatus)) {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 })
    }

    const updated = await prisma.reviewManage.update({
      where: { id },
      data:  {
        ...(status && { status: status as ReviewStatus }),
        ...(reply  !== undefined && { reply }),
        actionDate: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update review error:", error)
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 })
  }
}
