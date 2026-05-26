import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 })
  }

  const bookingId  = formData.get("bookingId")  as string
  const method     = formData.get("method")     as string   // "transfer" | "credit_card"
  const cardNumber = formData.get("cardNumber") as string | null
  const slipFile   = formData.get("slipFile")  as File | null

  if (!bookingId || !method) {
    return NextResponse.json({ message: "ຂໍ້ມູນບໍ່ຄົບ" }, { status: 400 })
  }

  try {
    // ตรวจสอบ booking
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) {
      return NextResponse.json({ message: "ບໍ່ພົບລາຍການຈອງ" }, { status: 404 })
    }
    if (booking.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
    if (booking.paymentStatus === "PAID" || booking.paymentStatus === "PENDING_VERIFY") {
      return NextResponse.json({ message: "ຊຳລະເງິນໄປແລ້ວ" }, { status: 409 })
    }

    let paymentStatus: "PAID" | "PENDING_VERIFY" = "PAID"
    let paymentProofPath: string | null = null

    // ── Bank Transfer — ต้องมีสลิป ─────────────────────────────────
    if (method === "transfer") {
      if (!slipFile) {
        return NextResponse.json({ message: "ກະລຸນາອັບໂຫຼດສລິບການໂອນ" }, { status: 400 })
      }

      const bytes  = await slipFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const ext      = slipFile.name.split(".").pop() ?? "jpg"
      const fileName = `slip_${bookingId}_${Date.now()}.${ext}`
      const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-slips")

      // สร้างโฟลเดอร์ถ้ายังไม่มี
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, fileName), buffer)

      paymentProofPath = `/uploads/payment-slips/${fileName}`
      paymentStatus    = "PENDING_VERIFY"
    }

    // ── Credit Card — ตรวจ format ────────────────────────────────
    if (method === "credit_card") {
      if (!cardNumber) {
        return NextResponse.json({ message: "ກະລຸນາປ້ອນເລກບັດ" }, { status: 400 })
      }
      const clean = cardNumber.replace(/\s/g, "")
      if (!/^\d{16}$/.test(clean)) {
        return NextResponse.json({ message: "ເລກບັດຕ້ອງມີ 16 ຕົວເລກ" }, { status: 400 })
      }
    }

    // อัปเดต DB
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus:  paymentStatus,
        paymentMethod:  method,
        paymentProof:   paymentProofPath,
      },
    })

    return NextResponse.json({
      success:       true,
      paymentStatus: updated.paymentStatus,
      message: method === "transfer"
        ? "ອັບໂຫຼດສລິບສຳເລັດ ກຳລັງລໍຖ້າການກວດສອບ"
        : "ຊຳລະເງິນສຳເລັດ",
    })

  } catch (error) {
    console.error("[PAYMENT_POST]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}