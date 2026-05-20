import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { roomId, rating, comment } = body

    // Validate required fields
    if (!roomId || !rating) {
      return NextResponse.json({ error: "Room ID and rating are required" }, { status: 400 })
    }

    // Check if rating is valid
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // Check if user has stayed at this room (completed booking)
    const completedBooking = await prisma.booking.findFirst({
      where: {
        userId: session.user.id,
        roomId,
        status: { in: ["COMPLETED", "CONFIRMED"] },
        checkOut: { lt: new Date() },
      },
    })

    if (!completedBooking) {
      return NextResponse.json({ error: "You can only review rooms you have stayed at" }, { status: 400 })
    }

    // Check if user already reviewed this room
    const existingReview = await prisma.review.findFirst({
      where: {
        userId: session.user.id,
        roomId,
      },
    })

    if (existingReview) {
      // Update existing review
      const review = await prisma.review.update({
        where: { id: existingReview.id },
        data: { rating, comment },
      })
      return NextResponse.json({ review })
    }

    // Create new review
    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        roomId,
        rating,
        comment,
      },
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

    const reviews = await prisma.review.findMany({
      where: { roomId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("Get reviews error:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
