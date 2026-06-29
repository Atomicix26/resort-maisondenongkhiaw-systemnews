import { describe, it, expect, vi, beforeEach } from "vitest"

const findFirst = vi.fn()
const findMany  = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    priceConfig: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      findMany:  (...args: unknown[]) => findMany(...args),
    },
  },
}))

import { getEffectiveNightlyPrice, getStayPricing } from "@/lib/pricing"

describe("getEffectiveNightlyPrice", () => {
  beforeEach(() => {
    findFirst.mockReset()
  })

  it("returns the room price when the room has no roomTypeId", async () => {
    const res = await getEffectiveNightlyPrice({ price: 1500, roomTypeId: null })
    expect(res).toEqual({ nightlyPrice: 1500, source: "ROOM", seasonName: null })
    expect(findFirst).not.toHaveBeenCalled()
  })

  it("returns the room price when no dates are supplied", async () => {
    const res = await getEffectiveNightlyPrice({ price: 2000, roomTypeId: "rt-1" })
    expect(res.source).toBe("ROOM")
    expect(res.nightlyPrice).toBe(2000)
    expect(findFirst).not.toHaveBeenCalled()
  })

  it("returns the room price when no active price config matches the dates", async () => {
    findFirst.mockResolvedValue(null)
    const res = await getEffectiveNightlyPrice(
      { price: 2000, roomTypeId: "rt-1" },
      new Date("2026-07-01"),
      new Date("2026-07-03"),
    )
    expect(res).toEqual({ nightlyPrice: 2000, source: "ROOM", seasonName: null })
  })

  it("applies the matching seasonal price config over the room price", async () => {
    findFirst.mockResolvedValue({ seasonName: "High Season", priceAmount: 3500 })
    const res = await getEffectiveNightlyPrice(
      { price: 2000, roomTypeId: "rt-1" },
      new Date("2026-12-24"),
      new Date("2026-12-26"),
    )
    expect(res).toEqual({
      nightlyPrice: 3500,
      source: "PRICE_CONFIG",
      seasonName: "High Season",
    })
  })

  it("coerces Decimal-like price values via Number()", async () => {
    findFirst.mockResolvedValue(null)
    const res = await getEffectiveNightlyPrice(
      { price: { toString: () => "1234.50" }, roomTypeId: "rt-1" },
      new Date("2026-07-01"),
      new Date("2026-07-03"),
    )
    expect(res.nightlyPrice).toBe(1234.5)
  })
})

describe("getStayPricing", () => {
  beforeEach(() => {
    findMany.mockReset()
  })

  it("uses room price for every night when room has no roomTypeId", async () => {
    const res = await getStayPricing(
      { price: 1500, roomTypeId: null },
      new Date("2026-07-01"),
      new Date("2026-07-04"), // 3 คืน
    )
    expect(res.nights).toBe(3)
    expect(res.total).toBe(4500)
    expect(findMany).not.toHaveBeenCalled()
  })

  it("uses room price for every night when no config matches", async () => {
    findMany.mockResolvedValue([])
    const res = await getStayPricing(
      { price: 2000, roomTypeId: "rt-1" },
      new Date("2026-07-01"),
      new Date("2026-07-03"), // 2 คืน
    )
    expect(res.total).toBe(4000)
  })

  it("charges each night by the season covering that night (cross-season stay)", async () => {
    // High season ครอบ 31 ธ.ค.–2 ม.ค., นอกนั้นใช้ราคาห้อง
    findMany.mockResolvedValue([
      {
        seasonName: "NYE",
        priceAmount: 5000,
        startDate: new Date(Date.UTC(2026, 11, 31)),
        endDate:   new Date(Date.UTC(2027, 0, 2)),
      },
    ])
    // พัก 30 ธ.ค. – 2 ม.ค. = 3 คืน: 30(ห้อง 2000), 31(NYE 5000), 1(NYE 5000)
    const res = await getStayPricing(
      { price: 2000, roomTypeId: "rt-1" },
      new Date(Date.UTC(2026, 11, 30)),
      new Date(Date.UTC(2027, 0, 2)),
    )
    expect(res.nights).toBe(3)
    expect(res.total).toBe(2000 + 5000 + 5000)
    expect(res.breakdown.map((b) => b.price)).toEqual([2000, 5000, 5000])
    expect(res.breakdown.map((b) => b.seasonName)).toEqual([null, "NYE", "NYE"])
  })

  it("picks the highest-priority config when seasons overlap on a night", async () => {
    // configs ถูกส่งเรียง priority สูง→ต่ำมาแล้วจาก query (orderBy)
    findMany.mockResolvedValue([
      { seasonName: "Promo", priceAmount: 1000, startDate: new Date(Date.UTC(2026, 6, 1)), endDate: new Date(Date.UTC(2026, 6, 31)) },
      { seasonName: "Base",  priceAmount: 3000, startDate: new Date(Date.UTC(2026, 6, 1)), endDate: new Date(Date.UTC(2026, 6, 31)) },
    ])
    const res = await getStayPricing(
      { price: 2000, roomTypeId: "rt-1" },
      new Date(Date.UTC(2026, 6, 10)),
      new Date(Date.UTC(2026, 6, 12)), // 2 คืน
    )
    expect(res.total).toBe(2000) // 1000 × 2 (Promo ชนะ)
  })
})
