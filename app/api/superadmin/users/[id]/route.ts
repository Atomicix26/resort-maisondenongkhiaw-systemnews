import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

// PATCH /api/superadmin/users/[id] — เปลี่ยน role / soft delete
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // ห้ามแก้ตัวเอง
    if (id === session.user.id)
      return NextResponse.json({ error: "ບໍ່ສາມາດແກ້ໄຂຕົວເອງໄດ້" }, { status: 400 })

    // ห้าม SUPERADMIN แก้ไข SUPERADMIN คนอื่น (BUG-015)
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (!target)
      return NextResponse.json({ error: "ບໍ່ພົບຜູ້ໃຊ້" }, { status: 404 })
    if (target.role === "SUPERADMIN")
      return NextResponse.json({ error: "ບໍ່ສາມາດແກ້ໄຂ SUPERADMIN ຄົນອື່ນໄດ້" }, { status: 403 })

    const { role, deletedAt } = await request.json()

    if (role !== undefined && !Object.values(Role).includes(role as Role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(role      !== undefined && { role: role as Role }),
          ...(deletedAt !== undefined && { deletedAt: deletedAt ? new Date(deletedAt) : null }),
        },
      })

      // ถ้า downgrade จาก ADMIN → USER → deactivate staff ด้วย
      if (role === "USER") {
        await tx.staff.updateMany({
          where: { userId: id },
          data:  { isActive: false },
        })
      }
      // ถ้า upgrade เป็น ADMIN → สร้าง Staff ถ้ายังไม่มี
      if (role === "ADMIN") {
        const existing = await tx.staff.findFirst({ where: { userId: id } })
        if (!existing) {
          await tx.staff.create({ data: { userId: id } })
        } else {
          await tx.staff.updateMany({ where: { userId: id }, data: { isActive: true } })
        }
      }

      return user
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[SUPERADMIN_USERS_PATCH]", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

// DELETE /api/superadmin/users/[id] — soft delete
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    if (id === session.user.id)
      return NextResponse.json({ error: "ບໍ່ສາມາດລຶບຕົວເອງໄດ້" }, { status: 400 })

    // ห้าม SUPERADMIN ลบ SUPERADMIN คนอื่น (BUG-015)
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (!target)
      return NextResponse.json({ error: "ບໍ່ພົບຜູ້ໃຊ້" }, { status: 404 })
    if (target.role === "SUPERADMIN")
      return NextResponse.json({ error: "ບໍ່ສາມາດລຶບ SUPERADMIN ຄົນອື່ນໄດ້" }, { status: 403 })

    await prisma.user.update({
      where: { id },
      data:  { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SUPERADMIN_USERS_DELETE]", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
