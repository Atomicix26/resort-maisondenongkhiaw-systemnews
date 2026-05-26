import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    // ─── SUPERADMIN ───────────────────────────────
    if (pathname.startsWith("/superadmin")) {
      if (role !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/login", req.url))
      }
    }

    // ─── ADMIN & SUPERADMIN ─────────────────────────────
    const adminRoutes = ["/admin", "/booking", "/staff", "/schedule", "/review"]
    if (adminRoutes.some((r) => pathname.startsWith(r))) {
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/login", req.url))
      }
    }

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
      authorized: () => true,
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