import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendOtpEmail } from "@/lib/mail"

export async function POST(req: Request) {
  const { email } = await req.json()

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.deletedAt) {
    return NextResponse.json({ message: "ຖ້າອີເມວນີ້ມີໃນລະບົບ ພວກເຮົາຈະສົ່ງ OTP ໄປໃຫ້" })
  }

  const otp = crypto.randomInt(100000, 999999).toString()
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex")

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: hashedOtp,
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      otpAttempts: 0,
    },
  })

  await sendOtpEmail(user.email, otp)

  return NextResponse.json({ message: "ຖ້າອີເມວນີ້ມີໃນລະບົບ ພວກເຮົາຈະສົ່ງ OTP ໄປໃຫ້" })
}