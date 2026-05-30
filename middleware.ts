import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    // ─── SUPERADMIN only ──────────────────────────
    if (pathname.startsWith("/superadmin")) {
      if (role !== "SUPERADMIN") {
        // มี token แต่ role ไม่พอ → unauthorized
        // ไม่มี token → authorized:false จัดการให้แล้ว
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    // ─── ADMIN & SUPERADMIN ───────────────────────
    const adminRoutes = ["/admin", "/booking", "/staff", "/schedule", "/review"]
    if (adminRoutes.some((r) => pathname.startsWith(r))) {
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    // ─── USER (login แล้วก็พอ) ───────────────────
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
      // ✅ ต้องมี token ถึงผ่านได้ — ไม่มี token redirect /login อัตโนมัติ
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
    "/booking/:path*",
    "/staff/:path*",
    "/schedule/:path*",
    "/review/:path*",
    "/superadmin/:path*",
  ],
}