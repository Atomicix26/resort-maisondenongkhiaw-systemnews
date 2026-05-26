import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"   
import { BookingStatus, PaymentStatus } from "@prisma/client"

// GET — ดึง booking เดี่ยวตาม id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const booking = await prisma.booking.findUnique({
      where:   { id },
      include: { room: true, user: { select: { id: true, name: true, email: true } } },
    })

    if (!booking) {
      return NextResponse.json({ message: "ບໍ່ພົບລາຍການຈອງ" }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
    if (booking.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ booking })

  } catch (error) {
    console.error("[BOOKING_GET_ID]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

// PATCH — อัปเดต status / paymentStatus (user ยกเลิก, admin อนุมัติ)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) {
      return NextResponse.json({ message: "ບໍ່ພົບລາຍການຈອງ" }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
    if (booking.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // User ทั่วไป → ยกเลิกได้อย่างเดียว
    // Admin → เปลี่ยนได้ทุก status
    const { status, paymentStatus } = body

    if (!isAdmin && status && status !== "CANCELLED") {
      return NextResponse.json({ message: "ບໍ່ມີສິດປ່ຽນ status ນີ້" }, { status: 403 })
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status        && { status: status as BookingStatus }),
        ...(paymentStatus && { paymentStatus: paymentStatus as PaymentStatus }),
      },
      include: { room: { select: { name: true } } },
    })

    if (status === "CANCELLED") {
      console.log(`[EMAIL] Cancellation notice → ${session.user.email} | Booking: ${id}`)
    }

    return NextResponse.json({ booking: updatedBooking })

  } catch (error) {
    console.error("[BOOKING_PATCH_ID]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}