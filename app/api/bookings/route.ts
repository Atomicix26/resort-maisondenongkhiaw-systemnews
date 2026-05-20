import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PrismaClient } from "@prisma/client"
import { authOptions } from "@/lib/auth" 

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { roomId, checkIn, checkOut, guests, specialRequest, totalPrice } = body

    if (!roomId || !checkIn || !checkOut || !guests || !totalPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        roomId: roomId,
        AND: [
          { status: { not: "CANCELLED" } }, 

          {
            OR: [
              
              {
                checkIn: { lte: checkOutDate },
                checkOut: { gte: checkInDate }
              }
            ]
          }
        ]
      }
    })

    if (conflictingBooking) {
      return NextResponse.json({ error: "Room is not available for selected dates" }, { status: 400 })
    }

    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        roomId: roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: Number(guests),
        totalPrice: Number(totalPrice),
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        specialRequest: specialRequest || null,
        
      },
      include: {
        room: true 
      }
    })

    return NextResponse.json({ booking }, { status: 201 })

  } catch (error) {
    console.error("Booking error:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }


    const bookings = await prisma.booking.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        room: true, 
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ bookings })

  } catch (error) {
    console.error("Get bookings error:", error)
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  }
}