import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StaffRole } from "@prisma/client"

// PATCH /api/staff/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { name, lastName, phone, position, role, salary, startDate } = await request.json()

    const staff = await prisma.staff.findUnique({ where: { id: params.id } })
    if (!staff) return NextResponse.json({ error: "ບໍ່ພົບພະນັກງານ" }, { status: 404 })

    const result = await prisma.$transaction(async (tx) => {
      // ✅ ถ้า StaffRole เปลี่ยน → sync User.role ด้วย
      const newStaffRole = role as StaffRole | undefined
      const newUserRole =
        newStaffRole === StaffRole.STAFF
          ? "USER"
          : newStaffRole !== undefined
          ? "ADMIN"
          : undefined

      await tx.user.update({
        where: { id: staff.userId },
        data: {
          ...(name        !== undefined && { name }),
          ...(lastName    !== undefined && { lastName }),
          ...(phone       !== undefined && { phone }),
          ...(newUserRole !== undefined && { role: newUserRole }),
        },
      })

      return tx.staff.update({
        where: { id: params.id },
        data: {
          ...(position  !== undefined && { position }),
          ...(role      !== undefined && { role: newStaffRole }),
          ...(salary    !== undefined && { salary: salary ? parseFloat(salary) : null }),
          ...(startDate !== undefined && { startDate: new Date(startDate) }),
        },
        include: { user: { select: { id: true, name: true, lastName: true, email: true, phone: true, createdAt: true } } },
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[STAFF_PATCH]", error)
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 })
  }
}

// DELETE /api/staff/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const staff = await prisma.staff.findUnique({
      where:  { id: params.id },
      select: { userId: true },
    })
    if (!staff) return NextResponse.json({ error: "ບໍ່ພົບພະນັກງານ" }, { status: 404 })

    // ✅ ป้องกันลบตัวเอง
    if (staff.userId === session.user.id) {
      return NextResponse.json({ error: "ບໍ່ສາມາດລຶບຕົວເອງໄດ້" }, { status: 400 })
    }

    // ✅ transaction: deactivate + revoke role พร้อมกัน
    await prisma.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id: params.id },
        data:  { isActive: false },
      })
      await tx.user.update({
        where: { id: staff.userId },
        data:  { role: "USER" },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[STAFF_DELETE]", error)
    return NextResponse.json({ error: "Failed to deactivate staff" }, { status: 500 })
  }
}