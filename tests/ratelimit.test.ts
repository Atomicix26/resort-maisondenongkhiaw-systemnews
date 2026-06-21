import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { checkRateLimit, getIP, RATE_LIMITS } from "@/lib/ratelimit"

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows the first request and reports remaining quota", () => {
    const res = checkRateLimit("user-a", { limit: 3, windowMs: 1000 })
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(2)
  })

  it("blocks once the limit is exceeded within the window", () => {
    const opts = { limit: 2, windowMs: 1000 }
    expect(checkRateLimit("user-b", opts).allowed).toBe(true)
    expect(checkRateLimit("user-b", opts).allowed).toBe(true)
    const third = checkRateLimit("user-b", opts)
    expect(third.allowed).toBe(false)
    expect(third.remaining).toBe(0)
  })

  it("resets the counter after the window elapses", () => {
    const opts = { limit: 1, windowMs: 1000 }
    expect(checkRateLimit("user-c", opts).allowed).toBe(true)
    expect(checkRateLimit("user-c", opts).allowed).toBe(false)

    vi.advanceTimersByTime(1001)

    const afterReset = checkRateLimit("user-c", opts)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.remaining).toBe(0)
  })

  it("tracks keys independently", () => {
    const opts = { limit: 1, windowMs: 1000 }
    expect(checkRateLimit("alice", opts).allowed).toBe(true)
    expect(checkRateLimit("bob", opts).allowed).toBe(true)
  })
})

describe("getIP", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 70.41.3.18" },
    })
    expect(getIP(req)).toBe("203.0.113.1")
  })

  it("falls back to x-real-ip", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.7" },
    })
    expect(getIP(req)).toBe("198.51.100.7")
  })

  it("returns 'unknown' when no IP headers are present", () => {
    expect(getIP(new Request("https://example.com"))).toBe("unknown")
  })
})

describe("RATE_LIMITS", () => {
  it("defines stricter limits for auth endpoints than general api", () => {
    expect(RATE_LIMITS.login.limit).toBeLessThan(RATE_LIMITS.api.limit)
    expect(RATE_LIMITS.register.limit).toBeLessThan(RATE_LIMITS.api.limit)
  })
})
