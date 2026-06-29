import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

/**
 * RBAC matrix — integration tests for the privileged API guards.
 *
 * Verifies the access-control matrix end-to-end through the real route
 * handlers (not just the helper), across the two privilege tiers and the
 * three guard styles in the codebase:
 *
 *                       │ no session │ USER │ ADMIN │ SUPERADMIN
 *  ─────────────────────┼────────────┼──────┼───────┼───────────
 *  GET /admin/reviews   │    401     │ 403  │  200  │    200      (ADMIN_ROLES via hasRole)
 *  GET /staff           │    401     │ 403  │  403  │    200      (SUPERADMIN, 401+403 split)
 *  GET /superadmin/users│    403     │ 403  │  403  │    200      (SUPERADMIN, inline allowlist)
 *
 * The point of BUG-011 was to make these *allowlists* (fail closed), so a
 * role that is not explicitly granted must always be denied.
 */

// ── Mocks ────────────────────────────────────────────────────────────
const getServerSession = vi.fn()
vi.mock("next-auth", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))

const reviewFindMany = vi.fn()
const staffFindMany  = vi.fn()
const userFindMany   = vi.fn()
const $queryRaw      = vi.fn()
vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: { findMany: (...a: unknown[]) => reviewFindMany(...a) },
    staff:  { findMany: (...a: unknown[]) => staffFindMany(...a) },
    user:   { findMany: (...a: unknown[]) => userFindMany(...a) },
    $queryRaw: (...a: unknown[]) => $queryRaw(...a),
  },
}))

// Routes import enum runtime objects from @prisma/client; the real client is
// not available in the test env, so provide the values the handlers reference.
vi.mock("@prisma/client", () => ({
  Role:      { USER: "USER", ADMIN: "ADMIN", SUPERADMIN: "SUPERADMIN" },
  StaffRole: { STAFF: "STAFF", RECEPTIONIST: "RECEPTIONIST", MANAGER: "MANAGER", ADMIN: "ADMIN" },
}))

// Lightweight NextResponse so we don't depend on the full next/server runtime.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

import { GET as adminReviewsGET }   from "@/app/api/admin/reviews/route"
import { GET as staffGET }          from "@/app/api/staff/route"
import { GET as superadminUsersGET } from "@/app/api/superadmin/users/route"
import { hasRole, ADMIN_ROLES }     from "@/lib/rbac"

// ── Helpers ──────────────────────────────────────────────────────────
/** Set the session that getServerSession will resolve to for a given role. */
function asRole(role: string | null) {
  getServerSession.mockResolvedValue(role ? { user: { id: "u1", role } } : null)
}

function urlReq(url = "http://localhost/api/superadmin/users"): NextRequest {
  return { url } as unknown as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  // Past the guard, every privileged GET should return an empty, valid payload.
  reviewFindMany.mockResolvedValue([])
  staffFindMany.mockResolvedValue([])
  userFindMany.mockResolvedValue([])
  $queryRaw.mockResolvedValue([])
})

// ── ADMIN tier: ADMIN + SUPERADMIN allowed (hasRole / ADMIN_ROLES) ────
describe("RBAC — GET /api/admin/reviews (ADMIN tier)", () => {
  it.each([
    ["no session", null,         401],
    ["USER",       "USER",       403],
    ["ADMIN",      "ADMIN",      200],
    ["SUPERADMIN", "SUPERADMIN", 200],
  ] as const)("%s → %i", async (_label, role, expected) => {
    asRole(role)
    const res = await adminReviewsGET()
    expect(res.status).toBe(expected)
  })
})

// ── SUPERADMIN tier with explicit 401/403 split (staff) ──────────────
describe("RBAC — GET /api/staff (SUPERADMIN only)", () => {
  it.each([
    ["no session", null,         401],
    ["USER",       "USER",       403],
    ["ADMIN",      "ADMIN",      403], // ADMIN must NOT reach SUPERADMIN-only routes
    ["SUPERADMIN", "SUPERADMIN", 200],
  ] as const)("%s → %i", async (_label, role, expected) => {
    asRole(role)
    const res = await staffGET()
    expect(res.status).toBe(expected)
  })
})

// ── SUPERADMIN tier with inline allowlist (no 401, unauth → 403) ─────
describe("RBAC — GET /api/superadmin/users (SUPERADMIN only)", () => {
  it.each([
    ["no session", null,         403],
    ["USER",       "USER",       403],
    ["ADMIN",      "ADMIN",      403],
    ["SUPERADMIN", "SUPERADMIN", 200],
  ] as const)("%s → %i", async (_label, role, expected) => {
    asRole(role)
    const res = await superadminUsersGET(urlReq())
    expect(res.status).toBe(expected)
  })
})

// ── The central allowlist helper (fail-closed semantics) ─────────────
describe("hasRole — allowlist semantics (BUG-011)", () => {
  it.each([
    ["ADMIN",      true],
    ["SUPERADMIN", true],
    ["USER",       false],
    ["",           false],
    ["admin",      false], // case-sensitive: must match exactly
    ["MANAGER",    false], // an unrelated/future role is denied by default
  ] as const)("hasRole(%j) over ADMIN_ROLES → %s", (role, expected) => {
    expect(hasRole(role, ADMIN_ROLES)).toBe(expected)
  })

  it("denies nullish roles", () => {
    expect(hasRole(undefined, ADMIN_ROLES)).toBe(false)
    expect(hasRole(null, ADMIN_ROLES)).toBe(false)
  })
})
