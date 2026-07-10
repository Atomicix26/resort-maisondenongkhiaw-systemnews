import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const { email, otp, newPassword } = await req.json()

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.otpCode || !user.otpExpiresAt) {
    return NextResponse.json({ error: "ບໍ່ສາມາດຣີເຊັດລະຫັດຜ່ານໄດ້" }, { status: 400 })
  }

  if (user.otpAttempts >= 5) {
    return NextResponse.json({ error: "ປ້ອນຜິດເກີນກຳນົດ ກະລຸນາຂໍ OTP ໃໝ່" }, { status: 429 })
  }

  if (new Date() > user.otpExpiresAt) {
    return NextResponse.json({ error: "OTP ໝົດອາຍຸແລ້ວ" }, { status: 400 })
  }

  const hashedInput = crypto.createHash("sha256").update(otp).digest("hex")

  if (hashedInput !== user.otpCode) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpAttempts: { increment: 1 } },
    })
    return NextResponse.json({ error: "OTP ບໍ່ຖືກຕ້ອງ" }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    },
  })

  return NextResponse.json({ message: "ປ່ຽນລະຫັດຜ່ານສຳເລັດ" })
}