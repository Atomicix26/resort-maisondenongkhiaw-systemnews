import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StaffRole, Role } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

// PATCH /api/staff/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const { name, lastName, phone, position, role, salary, startDate } = await request.json()

    const staff = await prisma.staff.findUnique({ where: { id } })
    if (!staff) return NextResponse.json({ error: "ບໍ່ພົບພະນັກງານ" }, { status: 404 })

    const result = await prisma.$transaction(async (tx) => {
      // อัปเดต User info
      await tx.user.update({
        where: { id: staff.userId },
        data: {
          ...(name     !== undefined && { name }),
          ...(lastName !== undefined && { lastName }),
          ...(phone    !== undefined && { phone }),
        },
      })

      let userRoleUpdate = {}
      if (role !== undefined) {
        const newStaffRole = role as StaffRole
        const newUserRole: Role =
          newStaffRole === StaffRole.ADMIN || newStaffRole === StaffRole.MANAGER
            ? Role.ADMIN
            : Role.USER
        userRoleUpdate = { role: newUserRole }
        await tx.user.update({
          where: { id: staff.userId },
          data:  userRoleUpdate,
        })
      }

      return tx.staff.update({
        where: { id },
        data: {
          ...(position  !== undefined && { position }),
          ...(role      !== undefined && { role: role as StaffRole }),
          ...(salary    !== undefined && { salary: salary ? parseFloat(salary) : null }),
          ...(startDate !== undefined && { startDate: new Date(startDate) }),
        },
        include: {
          user: { select: { id: true, name: true, lastName: true, email: true, phone: true, createdAt: true } },
        },
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[STAFF_PATCH]", error)
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params

    const staff = await prisma.staff.findUnique({
      where:   { id },
      include: { user: { select: { id: true } } },
    })
    if (!staff) return NextResponse.json({ error: "ບໍ່ພົບພະນັກງານ" }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // 1. deactivate staff
      await tx.staff.update({
        where: { id },
        data:  { isActive: false },
      })

      await tx.user.update({
        where: { id: staff.userId },
        data: {
          role:      Role.USER,          
          deletedAt: new Date(),          
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[STAFF_DELETE]", error)
    return NextResponse.json({ error: "Failed to deactivate staff" }, { status: 500 })
  }
}