import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { roomId, rating, comment } = body

    if (!roomId || !rating) {
      return NextResponse.json({ error: "Room ID and rating are required" }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // ✅ เช็คเฉพาะ COMPLETED เท่านั้น (checkout จริงแล้ว)
    const completedBooking = await prisma.booking.findFirst({
      where: {
        userId:   session.user.id,
        roomId,
        status:   "COMPLETED",
        deletedAt: null,
      },
    })
    if (!completedBooking) {
      return NextResponse.json(
        { error: "You can only review rooms you have stayed at" },
        { status: 400 }
      )
    }

    // ✅ เช็ค soft delete ด้วย
    const existingReview = await prisma.review.findFirst({
      where: { userId: session.user.id, roomId, deletedAt: null },
    })

    if (existingReview) {
      const review = await prisma.review.update({
        where: { id: existingReview.id },
        data:  { rating, comment, updatedAt: new Date() },
      })
      return NextResponse.json({ review })
    }

    // ✅ สร้าง Review + ReviewManage พร้อมกัน (transaction)
    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: { userId: session.user.id, roomId, rating, comment },
      })
      await tx.reviewManage.create({
        data: { reviewId: newReview.id, status: "PENDING" },
      })
      return newReview
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error("Review error:", error)
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
    }

    // ✅ filter soft delete
    const reviews = await prisma.review.findMany({
      where: { roomId, deletedAt: null },
      include: {
        user: { select: { name: true, lastName: true } },
        management: { select: { status: true, reply: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("Get reviews error:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}