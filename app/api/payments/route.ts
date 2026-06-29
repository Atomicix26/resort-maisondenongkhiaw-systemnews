import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getIP, RATE_LIMITS } from "@/lib/ratelimit"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const EXT_MAP = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
} as const

// ── ตรวจชนิดไฟล์จริงจาก magic bytes — ไม่เชื่อ MIME ที่ client ส่งมา (BUG-006)
function sniffImageType(buf: Buffer): keyof typeof EXT_MAP | null {
  if (buf.length < 12) return null

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg"
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png"
  }
  // WEBP: "RIFF" .... "WEBP"
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp"
  }
  // HEIC: กล่อง "ftyp" ที่ offset 4 + brand ที่รองรับ
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"])
    if (HEIC_BRANDS.has(buf.toString("ascii", 8, 12))) return "image/heic"
  }
  return null
}

// ✅ ลบ credit_card ออก + map status ให้ถูกต้อง
const METHOD_MAP: Record<string, "TRANSFER" | "CASH"> = {
  transfer:     "TRANSFER",
  pay_at_hotel: "CASH",
}

// ✅ pay_at_hotel ยังไม่ได้จ่าย → PENDING (ไม่ใช่ PAID)
const STATUS_MAP: Record<string, "PENDING_VERIFY" | "PENDING"> = {
  transfer:     "PENDING_VERIFY",
  pay_at_hotel: "PENDING",
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // ── Rate limit: 10 ครั้ง / 15 นาที ต่อ user และต่อ IP (BUG-007) ──────
  // กันยิงอัปสลิป/สร้างธุรกรรมรัวๆ และกัน upload abuse
  const ip = getIP(request)
  for (const key of [`payment:user:${session.user.id}`, `payment:ip:${ip}`]) {
    const rl = checkRateLimit(key, RATE_LIMITS.payment)
    if (!rl.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))
      return NextResponse.json(
        { message: "ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າສັກຄູ່" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      )
    }
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 })
  }

  // ✅ ลบ cardNumber ออก
  const bookingId = formData.get("bookingId") as string
  const method    = formData.get("method")    as string
  const slipFile  = formData.get("slipFile")  as File | null

  if (!bookingId || !method) {
    return NextResponse.json({ message: "ຂໍ້ມູນບໍ່ຄົບ" }, { status: 400 })
  }

  const paymentMethod = METHOD_MAP[method]
  if (!paymentMethod) {
    return NextResponse.json({ message: "ວິທີຊຳລະບໍ່ຖືກຕ້ອງ" }, { status: 400 })
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

    if (!booking) return NextResponse.json({ message: "ບໍ່ພົບລາຍການຈອງ" }, { status: 404 })
    if (booking.userId !== session.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 })

    const pendingTx = booking.transactions[0]
    if (!pendingTx) return NextResponse.json({ message: "ບໍ່ພົບລາຍການຊຳລະ" }, { status: 404 })
    if (["PAID", "PENDING_VERIFY"].includes(pendingTx.status)) {
      return NextResponse.json({ message: "ຊຳລະເງິນໄປແລ້ວ" }, { status: 409 })
    }

    let slipFileName: string | null = null

    // ── Bank Transfer: ต้องมีสลิป ──────────────────────────────
    if (method === "transfer") {
      if (!slipFile) {
        return NextResponse.json({ message: "ກະລຸນາອັບໂຫຼດສລິບ" }, { status: 400 })
      }
      if (slipFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ message: "ຂະໜາດໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB" }, { status: 400 })
      }

      const bytes  = await slipFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // ตรวจขนาดจริงซ้ำจาก buffer (size จาก client เชื่อ 100% ไม่ได้)
      if (buffer.byteLength > MAX_FILE_SIZE) {
        return NextResponse.json({ message: "ຂະໜາດໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB" }, { status: 400 })
      }

      // ✅ ตรวจชนิดไฟล์จริงจาก magic bytes แทนการเชื่อ slipFile.type (BUG-006)
      const detectedMime = sniffImageType(buffer)
      if (!detectedMime) {
        return NextResponse.json({ message: "ຮອງຮັບສະເພາະຮູບ JPG, PNG, WEBP, HEIC" }, { status: 400 })
      }

      const ext       = EXT_MAP[detectedMime]
      const randomHex = crypto.randomBytes(16).toString("hex")
      slipFileName    = `slip_${randomHex}.${ext}`

      const uploadDir = path.join(process.cwd(), "private", "uploads", "payment-slips")
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, slipFileName), buffer)
    }

    // ── Pay at Hotel: ไม่ต้องมีสลิป ────────────────────────────
    const updated = await prisma.paymentTransaction.update({
      where: { id: pendingTx.id },
      data: {
        method:      paymentMethod,
        status:      STATUS_MAP[method],
        slipImage:   slipFileName,
        // ✅ pay_at_hotel ยังไม่ได้จ่าย → paymentDate เป็น null
        paymentDate: method === "transfer" ? new Date() : null,
      },
    })

    return NextResponse.json({
      success:       true,
      transactionId: updated.id,
      status:        updated.status,
      message:
        method === "transfer"
          ? "ອັບໂຫຼດສລິບສຳເລັດ — ກຳລັງລໍຖ້າ Admin ກວດສອບ"
          : "ຈອງສຳເລັດ — ຊຳລະໄດ້ທີ່ Hotel ໃນວັນ Check-in",
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
    const booking = await prisma.booking.findUnique({ where: { id: bookingId, deletedAt: null } })
    if (!booking) return NextResponse.json({ message: "ບໍ່ພົບ Booking" }, { status: 404 })

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