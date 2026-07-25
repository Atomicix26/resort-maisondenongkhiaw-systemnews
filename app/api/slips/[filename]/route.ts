import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { readFile } from "fs/promises"
import path from "path"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { filename } = await params

  // ✅ ป้องกัน path traversal เช่น ../../etc/passwd
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ message: "Invalid filename" }, { status: 400 })
  }

  // ✅ อนุญาตเฉพาะนามสกุลที่รู้จัก
  const allowedExt = new Set(["jpg", "jpeg", "png", "webp", "heic"])
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  if (!allowedExt.has(ext)) {
    return NextResponse.json({ message: "Invalid file type" }, { status: 400 })
  }

  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
  if (!isAdmin) {
    const ownSlip = await prisma.paymentTransaction.findFirst({
      where: {
        slipImage: filename,
        booking: { userId: session.user.id, deletedAt: null },
      },
      select: { id: true },
    })
    if (!ownSlip) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
  }

  try {
    const filePath = path.join(
      process.cwd(),
      "private",
      "uploads",
      "payment-slips",
      filename
    )
    const fileBuffer = await readFile(filePath)

    const mimeMap: Record<string, string> = {
      jpg:  "image/jpeg",
      jpeg: "image/jpeg",
      png:  "image/png",
      webp: "image/webp",
      heic: "image/heic",
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type":        mimeMap[ext] ?? "application/octet-stream",
        "Cache-Control":       "private, no-store",  // ✅ ไม่ cache ใน browser
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ message: "File not found" }, { status: 404 })
  }
}
