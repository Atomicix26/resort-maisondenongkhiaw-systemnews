import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StaffRole, Role } from "@prisma/client"

function toUserRole(staffRole: StaffRole): Role {
  return staffRole === StaffRole.ADMIN || staffRole === StaffRole.MANAGER
    ? Role.ADMIN
    : Role.USER
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "USER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, lastName, phone, position, role, salary, startDate } =
    await request.json()

  const staff = await prisma.staff.findUnique({ where: { id: params.id } })
  if (!staff)
    return NextResponse.json({ error: "ບໍ່ພົບພະນັກງານ" }, { status: 404 })

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: staff.userId },
      data: {
        ...(name     !== undefined && { name }),
        ...(lastName !== undefined && { lastName }),
        ...(phone    !== undefined && { phone }),
        ...(role !== undefined && { role: toUserRole(role as StaffRole) }),
      },
    })
    return tx.staff.update({
      where: { id: params.id },
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
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "USER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const staff = await prisma.staff.findUnique({
    where:   { id: params.id },
    select:  { userId: true },
  })
  if (!staff)
    return NextResponse.json({ error: "ບໍ່ພົບພະນັກງານ" }, { status: 404 })

  if (staff.userId === session.user.id)
    return NextResponse.json({ error: "ບໍ່ສາມາດລຶບຕົວເອງໄດ້" }, { status: 400 })

  // ✅ set deletedAt ด้วย — auth.ts ใช้ตรวจ login
  await prisma.$transaction([
    prisma.staff.update({
      where: { id: params.id },
      data:  { isActive: false },
    }),
    prisma.user.update({
      where: { id: staff.userId },
      data: {
        role:      Role.USER,
        deletedAt: new Date(),   // ✅ ทำให้ login ไม่ได้เลย (auth เช็คตรงนี้)
      },
    }),
  ])

  return NextResponse.json({ success: true })
}