import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasRole, ADMIN_ROLES } from "@/lib/rbac"
import { BookingStatus, RoomStatus } from "@prisma/client"
import { saveImageUpload } from "@/lib/upload"
import { nextId } from "@/lib/ids"

type Params = { params: Promise<{ id: string }> }

// PATCH /api/admin/bookings/[id] — เปลี่ยน status + check-in/out
// รองรับ 2 รูปแบบ body:
//  • JSON            — เปลี่ยน status ทั่วไป (ยืนยัน/ยกเลิก/check-out/สำเร็จ)
//  • multipart/form  — check-in พร้อมเอกสารยืนยันตัวตน + รูปถ่ายเอกสาร
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasRole(session.user.role, ADMIN_ROLES)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    let status: string | undefined
    let actualCheckIn: string | undefined, actualCheckOut: string | undefined
    let checkInRemarks: string | undefined, checkOutRemarks: string | undefined
    let docType: string | undefined, docNumber: string | undefined
    let nationality: string | undefined, docExpiry: string | undefined
    let docFile: File | null = null

    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData()
      const str = (k: string) => { const v = fd.get(k); return typeof v === "string" && v ? v : undefined }
      status          = str("status")
      actualCheckIn   = str("actualCheckIn")
      actualCheckOut  = str("actualCheckOut")
      checkInRemarks  = str("checkInRemarks")
      checkOutRemarks = str("checkOutRemarks")
      docType         = str("docType")
      docNumber       = str("docNumber")
      nationality     = str("nationality")
      docExpiry       = str("docExpiry")
      const f = fd.get("docImage")
      docFile = f instanceof File && f.size > 0 ? f : null
    } else {
      const body = await request.json()
      ;({ status, actualCheckIn, actualCheckOut, checkInRemarks, checkOutRemarks,
          docType, docNumber, nationality, docExpiry } = body)
    }

    if (status !== undefined && !Object.values(BookingStatus).includes(status as BookingStatus)) {
      return NextResponse.json({ error: "Invalid booking status" }, { status: 400 })
    }

    // อัปโหลดรูปเอกสาร (เฉพาะตอน check-in) — เก็บไฟล์ก่อนเข้า transaction
    let docImageName: string | null = null
    if (docFile && status === "CHECKED_IN") {
      const saved = await saveImageUpload(docFile, "checkin-docs", "doc")
      if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 })
      docImageName = saved.filename
    }
    const docExpiryDate = docExpiry ? new Date(docExpiry) : null
    const validDocExpiry = docExpiryDate && !isNaN(docExpiryDate.getTime()) ? docExpiryDate : null

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { room: true },
    })
    if (!booking) return NextResponse.json({ error: "ບໍ່ພົບ booking" }, { status: 404 })

    // State machine validation
    const TRANSITIONS: Record<string, BookingStatus[]> = {
      PENDING:     ["CONFIRMED", "CANCELLED", "NO_SHOW"],
      CONFIRMED:   ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
      CHECKED_IN:  ["CHECKED_OUT"],
      CHECKED_OUT: ["COMPLETED"],
      COMPLETED:   [],
      CANCELLED:   [],
      NO_SHOW:     [],
    }
    if (status && !TRANSITIONS[booking.status]?.includes(status as BookingStatus)) {
      return NextResponse.json(
        { error: `ປ່ຽນ status ຈາກ ${booking.status} → ${status} ບໍ່ໄດ້` },
        { status: 400 }
      )
    }

    const staff = await prisma.staff.findFirst({ where: { userId: session.user.id } })

    const updated = await prisma.$transaction(async (tx) => {
      // อัปเดต Booking
      const b = await tx.booking.update({
        where: { id },
        data: {
          ...(status         && { status: status as BookingStatus }),
          // ออกจาก PENDING แล้ว (ยืนยัน/ยกเลิก/เช็คอิน) → ล้างกำหนดชำระ ไม่ให้ค้าง
          // ทำให้หน้า payment ขึ้น "หมดเวลาชำระ" ผิด ทั้งที่ booking ยืนยันแล้ว
          ...(status && status !== "PENDING" && { expiresAt: null }),
          ...(actualCheckIn  && { actualCheckIn: new Date(actualCheckIn) }),
          ...(actualCheckOut && { actualCheckOut: new Date(actualCheckOut) }),
        },
        include: {
          user:         { select: { name: true, lastName: true, email: true } },
          room:         { select: { name: true, roomNumber: true } },
          transactions: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      })

      // Log check-in พร้อมเอกสารยืนยันตัวตน (staffId เป็น null ได้ถ้า admin ไม่มี Staff profile)
      if (status === "CHECKED_IN" && actualCheckIn) {
        const checkInLog = await tx.checkInLog.create({
          data: {
            id:          nextId("checkInLog"),
            bookingId:   id,
            staffId:     staff?.id ?? null,
            actualTime:  new Date(actualCheckIn),
            remarks:     checkInRemarks ?? null,
            docType:     docType ?? null,
            docNumber:   docNumber ?? null,
            nationality: nationality ?? null,
            docExpiry:   validDocExpiry,
            docImage:    docImageName,
          },
        })
        await tx.$executeRaw`
          UPDATE check_in_logs
          SET performedByUserId = ${session.user.id}
          WHERE id = ${checkInLog.id}
        `
      }
      // Log check-out
      if (status === "CHECKED_OUT" && actualCheckOut) {
        const checkOutLog = await tx.checkOutLog.create({
          data: { id: nextId("checkOutLog"), bookingId: id, staffId: staff?.id ?? null, actualTime: new Date(actualCheckOut), remarks: checkOutRemarks },
        })
        await tx.$executeRaw`
          UPDATE check_out_logs
          SET performedByUserId = ${session.user.id}
          WHERE id = ${checkOutLog.id}
        `
      }

      // เปลี่ยนสถานะห้องตาม booking status (ใช้ oldStatus จริงจาก DB เพื่อ audit ที่ถูกต้อง)
      // หมายเหตุ: CANCELLED ไปได้เฉพาะจาก PENDING/CONFIRMED ซึ่งห้องยังไม่เคยถูกตั้ง OCCUPIED
      // โดย booking นี้ → ไม่แตะสถานะห้อง กันการปลดล็อกห้องที่มีแขกพักจริงโดยพลาด (BUG-017)
      if (status === "CHECKED_IN") {
        await tx.room.update({ where: { id: booking.roomId }, data: { status: RoomStatus.OCCUPIED } })
        await tx.statusRoom.create({
          data: { id: nextId("statusRoom"), roomId: booking.roomId, staffId: staff?.id, oldStatus: booking.room.status, newStatus: RoomStatus.OCCUPIED },
        })
      } else if (status === "CHECKED_OUT") {
        await tx.room.update({ where: { id: booking.roomId }, data: { status: RoomStatus.AVAILABLE } })
        await tx.statusRoom.create({
          data: { id: nextId("statusRoom"), roomId: booking.roomId, staffId: staff?.id, oldStatus: booking.room.status, newStatus: RoomStatus.AVAILABLE },
        })
      }

      // ── ຈ່າຍທີ່ Hotel (CASH): ຮັບເງິນສົດຕອນ check-in → ຕັ້ງ CHARGE ທີ່ຍັງ PENDING ເປັນ PAID ──
      // ໂອນເງິນ/ສລິບ (TRANSFER) ຕ້ອງກວດຜ່ານ verify ແຍກ — ບ່ອນນີ້ແຕະສະເພາະເງິນສົດໜ້າເຄົາເຕີ.
      // ກັນ booking ຄ້າງ "ຍັງບໍ່ຊຳລະ" ຫຼັງ check-out ທັງທີ່ຮັບເງິນຈິງແລ້ວ.
      if (status === "CHECKED_IN") {
        await tx.paymentTransaction.updateMany({
          where: { bookingId: id, type: "CHARGE", method: "CASH", status: "PENDING" },
          data:  {
            status:           "PAID",
            paymentDate:      new Date(),
            verifiedById:     staff?.id ?? null,
            verifiedByUserId: session.user.id,
            verifiedAt:       new Date(),
          },
        })
      }

      // ── No-show: ปิด charge ที่ยังไม่จ่าย (ไม่คืนเงิน) ──────────────────────────
      // ห้องถูกปล่อยอัตโนมัติเพราะ conflict-check ไม่นับ NO_SHOW · charge ที่ PAID คงไว้
      if (status === "NO_SHOW") {
        await tx.paymentTransaction.updateMany({
          where: { bookingId: id, type: "CHARGE", status: "PENDING" },
          data:  { status: "FAILED", reason: "No-show — ບໍ່ມາ Check-in ຕາມກຳນົດ" },
        })
      }

      // อัปเดต BookApproval ถ้ามี
      if (status === "CONFIRMED" || status === "CANCELLED") {
        await tx.bookApproval.upsert({
          where:  { bookingId: id },
          create: { id: nextId("bookApproval"), bookingId: id, staffId: staff?.id, status: status === "CONFIRMED" ? "APPROVED" : "REJECTED", apprDate: new Date() },
          update: { staffId: staff?.id, status: status === "CONFIRMED" ? "APPROVED" : "REJECTED", apprDate: new Date() },
        })
      }

      return b
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[ADMIN_BOOKINGS_PATCH]", error)
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
  }
}
