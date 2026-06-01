import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, RATE_LIMITS } from "@/lib/ratelimit"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) return null

          // ── Rate limit: 10 ครั้ง / 15 นาที ต่อ email ────────────
          const rlEmail = checkRateLimit(
            `login:email:${credentials.email.toLowerCase()}`,
            RATE_LIMITS.login
          )
          if (!rlEmail.allowed) throw new Error("RATE_LIMIT")

          // ── Rate limit: 10 ครั้ง / 15 นาที ต่อ IP ──────────────
          const ip    = (req?.headers?.["x-forwarded-for"] as string)
                          ?.split(",")[0]?.trim()
                        ?? (req?.headers?.["x-real-ip"] as string)
                        ?? "unknown"
          const rlIP  = checkRateLimit(`login:ip:${ip}`, RATE_LIMITS.login)
          if (!rlIP.allowed) throw new Error("RATE_LIMIT")

          // ── ตรวจสอบ user ─────────────────────────────────────────
          const user = await prisma.user.findUnique({
            where:  { email: credentials.email },
            select: { id: true, email: true, name: true, password: true, role: true, deletedAt: true },
          })

          if (!user || user.deletedAt) return null

          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) return null

          return { id: user.id, email: user.email, name: user.name, role: user.role }

        } catch (error) {
          if ((error as Error).message === "RATE_LIMIT") throw error
          console.error("AUTH_ERROR:", error)
          return null
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id    = user.id
        token.name  = user.name
        token.email = user.email
        token.role  = user.role
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id    = token.id    as string
        session.user.name  = token.name  as string
        session.user.email = token.email as string
        session.user.role  = token.role  as string
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  session: { strategy: "jwt" },
  secret:  process.env.NEXTAUTH_SECRET,
}

export function getRedirectByRole(role: string): string {
  switch (role) {
    case "SUPERADMIN": return "/superadmin/dashboard"
    case "ADMIN":      return "/admin/dashboard"
    default:           return "/profile"
  }
}