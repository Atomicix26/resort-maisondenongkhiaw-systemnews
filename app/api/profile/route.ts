import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET — ดึงข้อมูล profile ของ user ที่ login อยู่
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { id: true, name: true, lastName: true, email: true, phone: true, role: true, createdAt: true },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("[PROFILE_GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// PATCH — แก้ไขข้อมูล profile
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

  const { name, lastName, phone } = body

  if (!name || !lastName) {
    return NextResponse.json({ message: "ກະລຸນາກອກຊື່ ແລະ ນາມສະກຸນ" }, { status: 400 })
  }

  try {
    const updated = await prisma.user.update({
      where:  { id: session.user.id },
      data:   { name, lastName, phone: phone ?? null },
      select: { id: true, name: true, lastName: true, email: true, phone: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PROFILE_PATCH]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}