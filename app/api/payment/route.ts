import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PrismaClient, PaymentStatus } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { writeFile } from "fs/promises"
import path from "path"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    
    const bookingId = formData.get("bookingId") as string
    const amount = formData.get("amount") as string
    const method = formData.get("method") as string
    const cardNumber = formData.get("cardNumber") as string
    const slipFile = formData.get("slipFile") as File | null

    if (!bookingId || !amount) {
      return NextResponse.json(
        { error: "Missing required payment information" }, 
        { status: 400 }
      )
    }

    // 1. ดึงข้อมูล Booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (booking.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 2. กำหนดสถานะและจัดการไฟล์
        let newPaymentStatus: PaymentStatus = PaymentStatus.PAID
        let paymentProofPath: string | null = null

    if (method === "transfer") {
      newPaymentStatus = PaymentStatus.PENDING_VERIFY
      
      // จัดการอัปโหลดไฟล์สลิป
      if (slipFile) {
        const bytes = await slipFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        // สร้างชื่อไฟล์ที่ไม่ซ้ำ
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 9)
        const fileExtension = slipFile.name.split('.').pop()
        const fileName = `slip_${bookingId}_${timestamp}_${randomStr}.${fileExtension}`
        
        // กำหนดที่เก็บไฟล์
        const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-slips")
        const filePath = path.join(uploadDir, fileName)
        
        // เขียนไฟล์ลง disk
        await writeFile(filePath, buffer)
        
        paymentProofPath = `/uploads/payment-slips/${fileName}`
        
        console.log(`[SLIP] File uploaded: ${fileName}`)
      } else {
        return NextResponse.json(
          { error: "Payment slip is required for bank transfer" }, 
          { status: 400 }
        )
      }
    } else if (method === "credit_card") {
      // Validate card number
      if (cardNumber) {
        const cleanCardNumber = cardNumber.replace(/\s/g, "")
        if (!/^\d{16}$/.test(cleanCardNumber)) {
          return NextResponse.json(
            { error: "Invalid card number format" }, 
            { status: 400 }
          )
        }
      } else {
        return NextResponse.json(
          { error: "Card number is required" }, 
          { status: 400 }
        )
      }
    }

    // 3. อัปเดตลง Database
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        paymentStatus: newPaymentStatus,
        paymentMethod: method,
        paymentProof: paymentProofPath,
      }
    })

    console.log(`[PAYMENT] Booking ${bookingId} updated to ${newPaymentStatus}`)

    return NextResponse.json({
      success: true,
      message: method === "transfer" 
        ? "Payment slip uploaded. Waiting for verification." 
        : "Payment successful!",
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      booking: updatedBooking,
    })
    
  } catch (error) {
    console.error("Payment error:", error)
    return NextResponse.json(
      { error: "Payment processing failed" }, 
      { status: 500 }
    )
  }
}