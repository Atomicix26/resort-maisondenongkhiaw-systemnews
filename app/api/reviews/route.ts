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
    const { bookingId, roomId: requestedRoomId, rating, comment } = body
    const parsedRating = Number(rating)

    if (!bookingId && !requestedRoomId) {
      return NextResponse.json({ error: "bookingId or roomId is required" }, { status: 400 })
    }
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    const completedBooking = await prisma.booking.findFirst({
      where: {
        userId: session.user.id,
        ...(bookingId ? { id: bookingId } : { roomId: requestedRoomId }),
        status: "COMPLETED",
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!completedBooking) {
      return NextResponse.json(
        { error: "You can only review rooms you have stayed at" },
        { status: 400 }
      )
    }

    const existingReview = await prisma.review.findFirst({
      where: { bookingId: completedBooking.id, deletedAt: null },
    })

    if (existingReview) {
      const review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: parsedRating,
          comment,
        },
      })
      return NextResponse.json({ review })
    }

    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          bookingId: completedBooking.id,
          rating: parsedRating,
          comment,
        },
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

// แสดงเฉพาะนามสกุลย่อ เพื่อไม่เปิดเผยชื่อ-นามสกุลเต็มของผู้เข้าพัก (PII)
function maskReviewer(name?: string | null, lastName?: string | null): string {
  const first   = name?.trim() ?? ""
  const initial = lastName?.trim()?.[0]
  if (!first && !initial) return "Anonymous"
  return initial ? `${first} ${initial}.`.trim() : first || "Anonymous"
}

// GET — รีวิวสาธารณะของห้อง: เฉพาะที่ผ่านการอนุมัติ + ปกปิด PII
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
    }

    const rows = await prisma.review.findMany({
      where: {
        deletedAt: null,
        booking: { roomId, deletedAt: null },
        // เฉพาะรีวิวที่ Admin อนุมัติแล้ว — ไม่รั่ว PENDING / HIDDEN / FLAGGED
        management: { is: { status: "APPROVED" } },
      },
      select: {
        id:        true,
        rating:    true,
        comment:   true,
        createdAt: true,
        booking: {
          select: {
            user: { select: { name: true, lastName: true } },
            room: { select: { id: true, name: true } },
          },
        },
        management: { select: { reply: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const reviews = rows.map((review) => ({
      id:        review.id,
      rating:    review.rating,
      comment:   review.comment,
      createdAt: review.createdAt,
      user:      { name: maskReviewer(review.booking.user.name, review.booking.user.lastName) },
      room:      review.booking.room,
      reply:     review.management?.reply ?? null,
    }))

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("Get reviews error:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
