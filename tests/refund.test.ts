import { describe, it, expect } from "vitest"
import { refundPercent, computeRefund } from "@/lib/refund"

// วันเช็คอินอ้างอิง (คงที่เพื่อคำนวณ deterministic)
const checkIn = new Date("2026-07-10T14:00:00Z")

describe("refundPercent — นโยบายเงินคืนตามเวลา", () => {
  it("คืน 100% เมื่อยกเลิก ≥ 3 วันก่อนเช็คอิน", () => {
    expect(refundPercent(checkIn, new Date("2026-07-07T14:00:00Z"))).toBe(100) // ครบ 3 วันพอดี
    expect(refundPercent(checkIn, new Date("2026-07-01T00:00:00Z"))).toBe(100)
  })

  it("คืน 50% เมื่อยกเลิก 1–2 วันก่อนเช็คอิน", () => {
    expect(refundPercent(checkIn, new Date("2026-07-08T14:00:00Z"))).toBe(50) // 2 วัน
    expect(refundPercent(checkIn, new Date("2026-07-09T13:00:00Z"))).toBe(50) // ~1 วัน
  })

  it("คืน 30% เมื่อยกเลิกภายในวันเดียว (ก่อนถึงเวลาเช็คอิน)", () => {
    expect(refundPercent(checkIn, new Date("2026-07-10T10:00:00Z"))).toBe(30)
  })

  it("คืน 0% เมื่อถึง/เลยเวลาเช็คอินแล้ว (no-show)", () => {
    expect(refundPercent(checkIn, new Date("2026-07-10T14:00:00Z"))).toBe(0)
    expect(refundPercent(checkIn, new Date("2026-07-11T00:00:00Z"))).toBe(0)
  })
})

describe("computeRefund — คำนวณยอดคืนจากยอดที่จ่ายจริง", () => {
  it("คิดยอดตามเปอร์เซ็นต์ + ปัดเศษ", () => {
    expect(computeRefund(1_400_000, checkIn, new Date("2026-07-01T00:00:00Z"))).toEqual({ percent: 100, amount: 1_400_000 })
    expect(computeRefund(1_400_000, checkIn, new Date("2026-07-09T13:00:00Z"))).toEqual({ percent: 50,  amount: 700_000 })
    expect(computeRefund(1_400_000, checkIn, new Date("2026-07-10T10:00:00Z"))).toEqual({ percent: 30,  amount: 420_000 })
    expect(computeRefund(1_400_000, checkIn, new Date("2026-07-11T00:00:00Z"))).toEqual({ percent: 0,   amount: 0 })
  })
})
