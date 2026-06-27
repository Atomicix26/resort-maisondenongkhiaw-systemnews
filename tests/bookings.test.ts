import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────────────────────
const getServerSession = vi.fn()
vi.mock("next-auth", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))

const getStayPricing = vi.fn()
vi.mock("@/lib/pricing", () => ({ getStayPricing: (...a: unknown[]) => getStayPricing(...a) }))

const roomFindUnique = vi.fn()
const bookingFindMany = vi.fn()
const $transaction = vi.fn()
vi.mock("@/lib/prisma", () => ({
  prisma: {
    room: { findUnique: (...a: unknown[]) => roomFindUnique(...a) },
    booking: { findMany: (...a: unknown[]) => bookingFindMany(...a) },
    $transaction: (...a: unknown[]) => $transaction(...a),
  },
}))

vi.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  }
  return {
    Prisma: {
      TransactionIsolationLevel: { Serializable: "Serializable" },
      PrismaClientKnownRequestError,
    },
  }
})

// Lightweight NextResponse so we don't depend on the full next/server runtime.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

import { POST, GET } from "@/app/api/bookings/route"

// ── Helpers ──────────────────────────────────────────────────────────
function req(body: unknown, throwOnJson = false): NextRequest {
  return {
    json: async () => {
      if (throwOnJson) throw new Error("bad json")
      return body
    },
  } as unknown as NextRequest
}

const FUTURE_IN = "2030-06-01"
const FUTURE_OUT = "2030-06-03"

const validBody = {
  roomId: "room-1",
  checkIn: FUTURE_IN,
  checkOut: FUTURE_OUT,
  guests: "2",
}

const activeRoom = {
  id: "room-1",
  isActive: true,
  status: "AVAILABLE",
  capacity: 4,
  price: 2000,
  roomTypeId: null,
}

function mockTransactionSuccess() {
  const bookingCreate = vi.fn().mockResolvedValue({ id: "booking-1", totalPrice: 4000 })
  const payCreate = vi.fn().mockResolvedValue({ id: "tx-1", amount: 4000 })
  const findFirst = vi.fn().mockResolvedValue(null)
  $transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      booking: { findFirst, create: bookingCreate },
      paymentTransaction: { create: payCreate },
    }),
  )
  return { bookingCreate, payCreate, findFirst }
}

beforeEach(() => {
  vi.clearAllMocks()
  // The route logs handled errors via console.error; silence it for clean output.
  vi.spyOn(console, "error").mockImplementation(() => {})
  getServerSession.mockResolvedValue({ user: { id: "user-1" } })
  getStayPricing.mockResolvedValue({ total: 4000, nights: 2, breakdown: [] })
})

// ── POST validation ──────────────────────────────────────────────────
describe("POST /api/bookings — auth & validation", () => {
  it("rejects unauthenticated requests with 401", async () => {
    getServerSession.mockResolvedValue(null)
    const res = await POST(req(validBody))
    expect(res.status).toBe(401)
  })

  it("returns 400 on unparseable JSON body", async () => {
    const res = await POST(req(null, true))
    expect(res.status).toBe(400)
  })

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(req({ roomId: "room-1", checkIn: FUTURE_IN }))
    expect(res.status).toBe(400)
  })

  it("returns 400 on invalid dates", async () => {
    const res = await POST(req({ ...validBody, checkIn: "not-a-date" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when check-out is not after check-in", async () => {
    const res = await POST(req({ ...validBody, checkIn: FUTURE_OUT, checkOut: FUTURE_IN }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when check-in is in the past", async () => {
    const res = await POST(req({ ...validBody, checkIn: "2020-01-01", checkOut: "2020-01-03" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 on an invalid guest count", async () => {
    const res = await POST(req({ ...validBody, guests: "0" }))
    expect(res.status).toBe(400)
  })
})

// ── POST room state ──────────────────────────────────────────────────
describe("POST /api/bookings — room availability", () => {
  it("returns 404 when the room does not exist", async () => {
    roomFindUnique.mockResolvedValue(null)
    const res = await POST(req(validBody))
    expect(res.status).toBe(404)
  })

  it("returns 404 when the room is inactive", async () => {
    roomFindUnique.mockResolvedValue({ ...activeRoom, isActive: false })
    const res = await POST(req(validBody))
    expect(res.status).toBe(404)
  })

  it("returns 409 when the room is under maintenance", async () => {
    roomFindUnique.mockResolvedValue({ ...activeRoom, status: "MAINTENANCE" })
    const res = await POST(req(validBody))
    expect(res.status).toBe(409)
  })

  it("returns 400 when guests exceed room capacity", async () => {
    roomFindUnique.mockResolvedValue({ ...activeRoom, capacity: 1 })
    const res = await POST(req({ ...validBody, guests: "5" }))
    expect(res.status).toBe(400)
  })
})

// ── POST booking creation ────────────────────────────────────────────
describe("POST /api/bookings — creation", () => {
  it("creates a booking with the server-calculated price (ignores any client price)", async () => {
    roomFindUnique.mockResolvedValue(activeRoom)
    const { bookingCreate, payCreate } = mockTransactionSuccess()

    const res = await POST(req({ ...validBody, totalPrice: "1" })) // attacker-supplied price
    expect(res.status).toBe(201)

    // totalPrice comes from getStayPricing (4000), never from the request body
    expect(bookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalPrice: 4000 }) }),
    )
    expect(payCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 4000 }) }),
    )
  })

  it("ties the booking to the authenticated user, not a body-supplied id", async () => {
    roomFindUnique.mockResolvedValue(activeRoom)
    const { bookingCreate } = mockTransactionSuccess()

    await POST(req({ ...validBody, userId: "someone-else" }))
    expect(bookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1" }) }),
    )
  })

  it("returns 409 when an overlapping booking already exists", async () => {
    roomFindUnique.mockResolvedValue(activeRoom)
    const findFirst = vi.fn().mockResolvedValue({ id: "existing-booking" })
    $transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        booking: { findFirst, create: vi.fn() },
        paymentTransaction: { create: vi.fn() },
      }),
    )
    const res = await POST(req(validBody))
    expect(res.status).toBe(409)
  })

  it("returns 500 on an unexpected database error", async () => {
    roomFindUnique.mockResolvedValue(activeRoom)
    $transaction.mockRejectedValue(new Error("connection lost"))
    const res = await POST(req(validBody))
    expect(res.status).toBe(500)
  })
})

// ── GET ──────────────────────────────────────────────────────────────
describe("GET /api/bookings", () => {
  it("rejects unauthenticated requests with 401", async () => {
    getServerSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns the user's bookings with derived payment fields", async () => {
    bookingFindMany.mockResolvedValue([
      {
        id: "booking-1",
        totalPrice: 4000,
        room: { id: "room-1", name: "Sea View", images: '["a.jpg"]', view: "SEA", bedType: "KING" },
        transactions: [{ status: "PAID", method: "TRANSFER", amount: 4000 }],
        review: null,
      },
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bookings).toHaveLength(1)
    expect(data.bookings[0].paymentStatus).toBe("PAID")
    expect(data.bookings[0].room.images).toEqual(["a.jpg"])
    expect(data.bookings[0].totalPrice).toBe(4000)
  })

  it("defaults paymentStatus to PENDING when there are no transactions", async () => {
    bookingFindMany.mockResolvedValue([
      {
        id: "booking-2",
        totalPrice: 1000,
        room: { id: "room-2", name: "Garden", images: null, view: "GARDEN", bedType: "TWIN" },
        transactions: [],
        review: null,
      },
    ])
    const res = await GET()
    const data = await res.json()
    expect(data.bookings[0].paymentStatus).toBe("PENDING")
    expect(data.bookings[0].room.images).toEqual([])
  })
})
