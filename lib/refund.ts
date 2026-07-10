// ── นโยบายเงินคืนเมื่อยกเลิกการจอง (คิดตามเวลาก่อนเช็คอิน) ────────────────────
// ≥3 วัน = 100% · 1–2 วัน = 50% · ภายในวันเดียว(ก่อนเช็คอิน) = 30% · no-show = 0%
// คิดจาก "วันที่ขอยกเลิก" → "วันเช็คอิน" เพื่อความเป็นธรรม (ไม่ขึ้นกับเวลาที่ admin อนุมัติ)

export const REFUND_POLICY: { label: string; percent: number }[] = [
  { label: "ຍົກເລີກກ່ອນ Check-in ຕັ້ງແຕ່ 3 ວັນຂຶ້ນໄປ", percent: 100 },
  { label: "ຍົກເລີກກ່ອນ Check-in 1–2 ວັນ",              percent: 50  },
  { label: "ຍົກເລີກພາຍໃນມື້ດຽວ (ກ່ອນຮອດເວລາ Check-in)", percent: 30  },
  { label: "ເລີຍວັນ Check-in / ບໍ່ມາ (no-show)",         percent: 0   },
]

// % ที่คืนตามเวลา
export function refundPercent(checkIn: Date, at: Date = new Date()): number {
  if (at >= checkIn) return 0 // no-show / เลยวันเช็คอินแล้ว
  const days = Math.floor((checkIn.getTime() - at.getTime()) / 86_400_000)
  if (days >= 3) return 100
  if (days >= 1) return 50
  return 30 // ภายในวันเดียว แต่ยังไม่ถึงเวลาเช็คอิน
}

export interface RefundResult {
  percent: number
  amount:  number
}

// คำนวณยอดคืนจากยอดที่ "จ่ายมาแล้วจริง"
export function computeRefund(
  paidAmount: number,
  checkIn: Date,
  at: Date = new Date(),
): RefundResult {
  const percent = refundPercent(checkIn, at)
  const amount  = Math.round((paidAmount * percent) / 100)
  return { percent, amount }
}
