import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StaffRole, Role } from "@prisma/client"
import bcrypt from "bcryptjs"

// GET /api/staff
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const staff = await prisma.staff.findMany({
      where:   { isActive: true },
      include: {
        user: { select: { id: true, name: true, lastName: true, email: true, phone: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error("[STAFF_GET]", error)
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role === "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { name, lastName, email, phone, password, position, role, salary, startDate } =
      await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "ຊື່, email ແລະ ລະຫັດຜ່ານ ຈຳເປັນ" }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: "Email ນີ້ມີໃນລະບົບແລ້ວ" }, { status: 409 })

    const hashed    = await bcrypt.hash(password, 12)
    const staffRole = (role as StaffRole) ?? StaffRole.STAFF

    const userRole: Role =
      staffRole === StaffRole.ADMIN || staffRole === StaffRole.MANAGER
        ? Role.ADMIN
        : Role.USER

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, lastName, email, phone, password: hashed, role: userRole },
      })
      const staff = await tx.staff.create({
        data: {
          userId:    user.id,
          position:  position ?? null,
          role:      staffRole,
          salary:    salary ? parseFloat(salary) : null,
          startDate: startDate ? new Date(startDate) : new Date(),
        },
        include: {
          user: { select: { id: true, name: true, lastName: true, email: true, phone: true, createdAt: true } },
        },
      })
      return staff
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[STAFF_POST]", error)
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 })
  }
}