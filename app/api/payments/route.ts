import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

// ✅ MIME whitelist + size limit
const ALLOWED_MIME  = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"])
const MAX_FILE_SIZE = 5 * 1024 * 1024  // 5 MB
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
}

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
  const method     = formData.get("method")     as string
  const cardNumber = formData.get("cardNumber") as string | null
  const slipFile   = formData.get("slipFile")  as File | null

  if (!bookingId || !method) {
    return NextResponse.json({ message: "ຂໍ້ມູນບໍ່ຄົບ" }, { status: 400 })
  }

  try {
    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId, deletedAt: null },
      include: {
        transactions: {
          where:   { type: "CHARGE" },
          orderBy: { createdAt: "desc" },
          take:    1,
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ message: "ບໍ່ພົບລາຍການຈອງ" }, { status: 404 })
    }
    if (booking.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const pendingTx = booking.transactions[0]
    if (!pendingTx) {
      return NextResponse.json({ message: "ບໍ່ພົບລາຍການຊຳລະ" }, { status: 404 })
    }
    if (pendingTx.status === "PAID" || pendingTx.status === "PENDING_VERIFY") {
      return NextResponse.json({ message: "ຊຳລະເງິນໄປແລ້ວ" }, { status: 409 })
    }

    const methodMap: Record<string, "TRANSFER" | "CREDIT_CARD" | "CASH"> = {
      transfer:    "TRANSFER",
      credit_card: "CREDIT_CARD",
      cash:        "CASH",
    }
    const paymentMethod = methodMap[method]
    if (!paymentMethod) {
      return NextResponse.json({ message: "ວິທີຊຳລະບໍ່ຖືກຕ້ອງ" }, { status: 400 })
    }

    let newStatus: "PAID" | "PENDING_VERIFY" = "PAID"
    // ✅ เก็บแค่ filename ไม่ใช่ path เต็ม
    let slipFileName: string | null = null

    if (paymentMethod === "TRANSFER") {
      if (!slipFile) {
        return NextResponse.json({ message: "ກະລຸນາອັບໂຫຼດສລິບ" }, { status: 400 })
      }

      // ✅ ตรวจ MIME type
      if (!ALLOWED_MIME.has(slipFile.type)) {
        return NextResponse.json(
          { message: "ຮອງຮັບສະເພາະ JPG, PNG, WEBP" },
          { status: 400 }
        )
      }

      // ✅ ตรวจ size
      if (slipFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: "ຂະໜາດໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB" },
          { status: 400 }
        )
      }

      const bytes     = await slipFile.arrayBuffer()
      const buffer    = Buffer.from(bytes)
      const ext       = EXT_MAP[slipFile.type] ?? "jpg"
      const randomHex = crypto.randomBytes(16).toString("hex")
      slipFileName    = `slip_${randomHex}.${ext}`

      // ✅ เก็บใน private/ — ไม่อยู่ใน public/ ใครก็ download ไม่ได้
      const uploadDir = path.join(process.cwd(), "private", "uploads", "payment-slips")
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, slipFileName), buffer)

      newStatus = "PENDING_VERIFY"
    }

    if (paymentMethod === "CREDIT_CARD") {
      if (!cardNumber) {
        return NextResponse.json({ message: "ກະລຸນາປ້ອນເລກບັດ" }, { status: 400 })
      }
      const clean = cardNumber.replace(/\s/g, "")
      if (!/^\d{16}$/.test(clean)) {
        return NextResponse.json({ message: "ເລກບັດຕ້ອງມີ 16 ຕົວ" }, { status: 400 })
      }
    }

    const updated = await prisma.paymentTransaction.update({
      where: { id: pendingTx.id },
      data: {
        method:      paymentMethod,
        status:      newStatus,
        slipImage:   slipFileName,   // ✅ เก็บแค่ชื่อไฟล์
        paymentDate: new Date(),
      },
    })

    return NextResponse.json({
      success:       true,
      transactionId: updated.id,
      status:        updated.status,
      message:
        paymentMethod === "TRANSFER"
          ? "ອັບໂຫຼດສລິບສຳເລັດ — ກຳລັງລໍຖ້າ Admin ກວດສອບ"
          : "ຊຳລະເງິນສຳເລັດ",
    })

  } catch (error) {
    console.error("[PAYMENT_POST]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const bookingId = new URL(request.url).searchParams.get("bookingId")
  if (!bookingId) {
    return NextResponse.json({ message: "bookingId is required" }, { status: 400 })
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
    })
    if (!booking) {
      return NextResponse.json({ message: "ບໍ່ພົບ Booking" }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
    if (booking.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const transactions = await prisma.paymentTransaction.findMany({
      where:   { bookingId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    })
  } catch (error) {
    console.error("[PAYMENT_GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}