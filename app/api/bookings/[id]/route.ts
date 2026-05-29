import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BookingStatus } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

// ─────────────────────────────────────────────────────────────
// GET — ดึง booking เดียว + transactions
// ─────────────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const booking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
      include: {
        room:         { select: { id: true, name: true, images: true, view: true, bedType: true } },
        transactions: { orderBy: { createdAt: "desc" } },
        cancelRequest: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ message: "ບໍ່ພົບການຈອງ" }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
    if (booking.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      booking: {
        ...booking,
        totalPrice: Number(booking.totalPrice),
        room: {
          ...booking.room,
          images: safeJson(booking.room.images, []),
        },
        transactions: booking.transactions.map((t) => ({
          ...t,
          amount: Number(t.amount),
        })),
      },
    })

  } catch (error) {
    console.error("[BOOKING_GET_ID]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH — เปลี่ยน status
// User: ยกเลิกได้อย่างเดียว (ต้องผ่าน CancelRequest)
// Admin: เปลี่ยนได้ทุก status ตาม State Machine
// Body: { status: BookingStatus }
// ─────────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
    })

    if (!booking) {
      return NextResponse.json({ message: "ບໍ່ພົບການຈອງ" }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
    if (booking.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // ── Validate status enum ──────────────────────────────────
    const validStatuses = Object.values(BookingStatus)
    if (body.status && !validStatuses.includes(body.status as BookingStatus)) {
      return NextResponse.json(
        { message: `status ຕ້ອງເປັນ: ${validStatuses.join(" | ")}` },
        { status: 400 }
      )
    }

    // ── User ทั่วไป: ยกเลิกได้ผ่าน CancelRequest เท่านั้น ────
    if (!isAdmin && body.status && body.status !== "CANCELLED") {
      return NextResponse.json({ message: "ບໍ່ມີສິດປ່ຽນ status ນີ້" }, { status: 403 })
    }

    // ── State Machine validation (Admin) ────────────────────
    if (isAdmin && body.status) {
      const allowedTransitions: Record<string, string[]> = {
        PENDING:      ["CONFIRMED", "CANCELLED"],
        CONFIRMED:    ["CHECKED_IN", "CANCELLED"],
        CHECKED_IN:   ["CHECKED_OUT"],
        CHECKED_OUT:  ["COMPLETED"],
        COMPLETED:    [],
        CANCELLED:    [],
      }
      const allowed = allowedTransitions[booking.status] ?? []
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { message: `ບໍ່ສາມາດປ່ຽນຈາກ ${booking.status} → ${body.status}` },
          { status: 422 }
        )
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status as BookingStatus }),
      },
      include: {
        room: { select: { name: true } },
      },
    })

    return NextResponse.json({ booking: updated })

  } catch (error) {
    console.error("[BOOKING_PATCH_ID]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE — Soft delete (Admin only)
// ─────────────────────────────────────────────────────────────
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
  if (!isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    await prisma.booking.update({
      where: { id },
      data:  { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[BOOKING_DELETE_ID]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}