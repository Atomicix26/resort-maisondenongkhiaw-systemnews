import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    // ── SUPERADMIN เท่านั้น ─────────────────────────────────────────
    // รวม /booking (room management) เข้ามาด้วย — Admin ไม่มีสิทธิ์แล้ว
    const superRoutes = [
      "/superadmin",
      "/booking",           // ← ย้ายจาก adminRoutes มา SuperAdmin
      "/staff",
    ]
    if (superRoutes.some((r) => pathname.startsWith(r))) {
      if (role !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    // ── ADMIN & SUPERADMIN ───────────────────────────────────────────
    // ลบ /booking ออก — Admin จัดการแค่ staff, schedule, review
    const adminRoutes = [
      "/admin",
      "/schedule",
      "/review",
    ]
    if (adminRoutes.some((r) => pathname.startsWith(r))) {
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    // ── USER (ต้อง login) ────────────────────────────────────────────
    const userRoutes = ["/profile", "/payment", "/history"]
    if (userRoutes.some((r) => pathname.startsWith(r))) {
      if (!role) {
        return NextResponse.redirect(new URL("/login", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/profile/:path*",
    "/payment/:path*",
    "/history/:path*",
    "/admin/:path*",
    "/booking/:path*",     // SuperAdmin only
    "/staff/:path*",       // SuperAdmin only
    "/schedule/:path*",
    "/review/:path*",
    "/superadmin/:path*",
  ],
}
