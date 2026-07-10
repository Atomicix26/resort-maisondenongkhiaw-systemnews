import { prisma } from "@/lib/prisma"

// ── ໄລຍະເວລາຊຳລະ: booking ທີ່ຍັງ PENDING ຕ້ອງຊຳລະພາຍໃນ 10 ນາທີ ─────────────
// ຄິດຈາກ Booking.createdAt → expiresAt = createdAt + PAYMENT_WINDOW_MS ຕອນສ້າງ
export const PAYMENT_WINDOW_MS = 10 * 60 * 1000 // 10 ນາທີ

export function paymentDeadline(from: Date = new Date()): Date {
  return new Date(from.getTime() + PAYMENT_WINDOW_MS)
}

// ── ຍົກເລີກ booking ທີ່ໝົດເວລາຊຳລະ ─────────────────────────────────────────
// ເປົ້າໝາຍ: booking ທີ່ຍັງ status=PENDING, ມີ expiresAt (ລູກຄ້າຍັງບໍ່ໄດ້ດຳເນີນ
// ການຊຳລະ) ແລະ expiresAt ຜ່ານໄປແລ້ວ → ຕັ້ງເປັນ CANCELLED + CHARGE ທີ່ຍັງ
// PENDING → FAILED. booking ທີ່ລູກຄ້າອັບສລິບ/ເລືອກຈ່າຍທີ່ hotel ຈະມີ expiresAt=null
// ຈຶ່ງບໍ່ຖືກແຕະ. ຄືນ = ຈຳນວນ booking ທີ່ຖືກຍົກເລີກ.
//
// ໝາຍເຫດ: ບໍ່ຕ້ອງແຕະສະຖານະຫ້ອງ — ຫ້ອງຈະຖືກຕັ້ງ OCCUPIED ຕອນ CHECKED_IN ເທົ່ານັ້ນ,
// ແລະ conflict-check ຂອງການຈອງນັບສະເພາະ booking ທີ່ບໍ່ແມ່ນ CANCELLED ຢູ່ແລ້ວ.
export async function expireStaleBookings(now: Date = new Date()): Promise<number> {
  const stale = await prisma.booking.findMany({
    where: {
      status:    "PENDING",
      deletedAt: null,
      expiresAt: { not: null, lt: now },
    },
    select: { id: true },
  })
  if (stale.length === 0) return 0

  let cancelled = 0
  for (const { id } of stale) {
    try {
      await prisma.$transaction(async (tx) => {
        // re-check within the transaction to avoid a race with a concurrent payment/verify
        const fresh = await tx.booking.findUnique({
          where:  { id },
          select: { status: true, expiresAt: true },
        })
        if (!fresh || fresh.status !== "PENDING" || !fresh.expiresAt || fresh.expiresAt >= now) {
          return
        }

        await tx.booking.update({
          where: { id },
          data:  { status: "CANCELLED", expiresAt: null },
        })
        await tx.paymentTransaction.updateMany({
          where: { bookingId: id, type: "CHARGE", status: "PENDING" },
          data:  { status: "FAILED", reason: "ໝົດເວລາຊຳລະ — ຍົກເລີກອັດຕະໂນມັດ" },
        })
        cancelled++
      })
    } catch (error) {
      console.error("[EXPIRE_BOOKING]", id, error)
    }
  }
  return cancelled
}

// ── No-show: ລູກຄ້າບໍ່ມາ Check-in ຕາມກຳນົດ ─────────────────────────────────────
// ຄนละ timeout กับ payment window: ນີ້ຄือ "ກຳນົດເວລາມາຮອດ" — ຖ້າ booking ຍັງ
// PENDING (ຈ່າຍທີ່ hotel) ຫຼື CONFIRMED (ຈ່າຍແລ້ວ) ແຕ່ບໍ່ໄດ້ Check-in ພາຍໃນ
// 18:00 ຂອງວັນ Check-in → ຕັ້ງເປັນ NO_SHOW. ຫ້ອງຖືກປ່ອຍໂດຍອັດຕະໂນມັດ
// (conflict-check ບໍ່ນັບ NO_SHOW). ບໍ່ຄืນເງິນ (0%) — CHARGE ທີ່ຍັງ PENDING → FAILED,
// CHARGE ທີ່ PAID (ໂອນມາແລ້ວ) ຄງໄວ້ຕາມເດີມ (no-show ບໍ່ຄืນ).
export const NO_SHOW_DEADLINE_HOUR = 18 // 18:00 ຂອງວັນ Check-in

export function noShowDeadline(checkIn: Date): Date {
  const d = new Date(checkIn)
  d.setHours(NO_SHOW_DEADLINE_HOUR, 0, 0, 0)
  return d
}

export async function expireNoShowBookings(now: Date = new Date()): Promise<number> {
  // ດຶງ candidate: booking ທີ່ຍັງ active (PENDING/CONFIRMED) ແລະ ວັນ Check-in ຜ່ານມາແລ້ວ
  // ຈາກນັ້ນ filter ດ້ວຍ deadline 18:00 ໃນ code (ຄິດຕໍ່ແຖວ)
  const candidates = await prisma.booking.findMany({
    where: {
      status:    { in: ["PENDING", "CONFIRMED"] },
      deletedAt: null,
      checkIn:   { lt: now },
    },
    select: { id: true, checkIn: true },
  })
  const due = candidates.filter(({ checkIn }) => noShowDeadline(checkIn) < now)
  if (due.length === 0) return 0

  let marked = 0
  for (const { id } of due) {
    try {
      await prisma.$transaction(async (tx) => {
        // re-check ໃນ transaction ກັນ race ກັບ check-in / cancel ທີ່ອາດເກີດພ້ອມກັນ
        const fresh = await tx.booking.findUnique({
          where:  { id },
          select: { status: true, checkIn: true },
        })
        if (!fresh || (fresh.status !== "PENDING" && fresh.status !== "CONFIRMED") || noShowDeadline(fresh.checkIn) >= now) {
          return
        }
        await tx.booking.update({
          where: { id },
          data:  { status: "NO_SHOW", expiresAt: null },
        })
        // ปิด charge ที่ยังไม่จ่าย (จ่ายที่ hotel) — ไม่แตะ charge ที่ PAID แล้ว (no-show ไม่คืน)
        await tx.paymentTransaction.updateMany({
          where: { bookingId: id, type: "CHARGE", status: "PENDING" },
          data:  { status: "FAILED", reason: "No-show — ບໍ່ມາ Check-in ຕາມກຳນົດ" },
        })
        marked++
      })
    } catch (error) {
      console.error("[EXPIRE_NO_SHOW]", id, error)
    }
  }
  return marked
}
