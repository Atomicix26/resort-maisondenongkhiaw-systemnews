import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  // ── 1. Parse body ──────────────────────────────────────────────────
  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 }
    )
  }

  const { name, lastName, phone, email, password } = body

  // ── 2. Validate ────────────────────────────────────────────────────
  if (!name || !lastName || !phone || !email || !password) {
    return NextResponse.json(
      { message: "ກະລຸນາກອກຂໍ້ມູນໃຫ້ຄົບທຸກຊ່ອງ" },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { message: "Password ຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວ" },
      { status: 400 }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { message: "Email ບໍ່ຖືກຕ້ອງ" },
      { status: 400 }
    )
  }

  // ── 3. DB operations ───────────────────────────────────────────────
  try {
    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      return NextResponse.json(
        { message: "Email ນີ້ຖຶກໃຊ້ງານແລ້ວ" },
        { status: 409 }
      )
    }

    const hashed = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: { name, lastName, phone, email, password: hashed, role: "USER" },
    })

    return NextResponse.json(
      { message: "ສະໝັກສຳເລັດ" },
      { status: 201 }
    )
  } catch (error) {
    // Log server-side but always return JSON to client
    console.error("[REGISTER_ERROR]", error)

    return NextResponse.json(
      { message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ ກະລຸນາລອງໃໝ່" },
      { status: 500 }
    )
  }
}