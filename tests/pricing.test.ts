import { describe, it, expect, vi, beforeEach } from "vitest"

const findFirst = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: { priceConfig: { findFirst: (...args: unknown[]) => findFirst(...args) } },
}))

import { getEffectiveNightlyPrice } from "@/lib/pricing"

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
