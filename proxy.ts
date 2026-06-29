import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl
    const role  = req.nextauth.token?.role as string | undefined
    const isApi = pathname.startsWith("/api/")

    // ปฏิเสธ: API → JSON, page → redirect (BUG-013)
    const deny = (status: 401 | 403, page: string) =>
      isApi
        ? NextResponse.json(
            { error: status === 401 ? "Unauthorized" : "Forbidden" },
            { status }
          )
        : NextResponse.redirect(new URL(page, req.url))

    // ── SUPERADMIN เท่านั้น (page + api) ─────────────────────────────
    const superPrefixes = [
      "/superadmin",
      "/booking",        // room management
      "/staff",
      "/api/superadmin",
      "/api/staff",
    ]
    if (superPrefixes.some((r) => pathname.startsWith(r))) {
      if (!role) return deny(401, "/login")
      if (role !== "SUPERADMIN") return deny(403, "/unauthorized")
    }

    // ── ADMIN & SUPERADMIN (page + api) ──────────────────────────────
    const adminPrefixes = [
      "/admin",
      "/schedule",
      "/review",
      "/api/admin",
      "/api/slips",      // serve payment slips
    ]
    if (adminPrefixes.some((r) => pathname.startsWith(r))) {
      if (!role) return deny(401, "/login")
      if (role !== "ADMIN" && role !== "SUPERADMIN") return deny(403, "/unauthorized")
    }

    // ── USER (ต้อง login) ────────────────────────────────────────────
    const userPrefixes = ["/profile", "/payment", "/history"]
    if (userPrefixes.some((r) => pathname.startsWith(r))) {
      if (!role) return deny(401, "/login")
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // ให้เข้า proxy function เสมอ แล้วตัดสิน 401/403 เอง
      // (เพื่อให้ API ตอบ JSON แทนการ redirect ไปหน้า login)
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: [
    // ── Pages ──
    "/profile/:path*",
    "/payment/:path*",
    "/history/:path*",
    "/admin/:path*",
    "/booking/:path*",      // SuperAdmin only
    "/staff/:path*",        // SuperAdmin only
    "/schedule/:path*",
    "/review/:path*",
    "/superadmin/:path*",
    // ── Privileged API (defense-in-depth — เสริม self-guard ในแต่ละ route) ──
    "/api/admin/:path*",        // ADMIN / SUPERADMIN
    "/api/slips/:path*",        // ADMIN / SUPERADMIN
    "/api/superadmin/:path*",   // SUPERADMIN
    "/api/staff/:path*",        // SUPERADMIN
  ],
}
