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
            select: {
              id: true, email: true, name: true, password: true, role: true, deletedAt: true,
              staff: { select: { isActive: true } },
            },
          })

          if (!user || user.deletedAt) return null
          if (user.role === "ADMIN" && user.staff && !user.staff.isActive) return null

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
      // ── ตอน login ครั้งแรก: ใส่ข้อมูลจาก authorize() ────────────────
      if (user) {
        token.id      = user.id
        token.name    = user.name
        token.email   = user.email
        token.role    = user.role
        token.invalid = false
        return token
      }

      // ── อ่าน session ครั้งถัดไป: ตรวจสอบกับ DB ใหม่ทุกครั้ง ──────────
      // กัน session ค้างหลังบัญชีถูกลบ / ปิดใช้งาน / ลด-เพิ่มสิทธิ์ (BUG-001)
      if (!token.id) {
        token.invalid = true
        token.role    = ""
        return token
      }

      const dbUser = await prisma.user.findUnique({
        where:  { id: token.id as string },
        select: {
          id: true, name: true, email: true, role: true, deletedAt: true,
          staff: { select: { isActive: true } },
        },
      })

      const revoked =
        !dbUser ||
        dbUser.deletedAt !== null ||
        (dbUser.role === "ADMIN" && dbUser.staff !== null && !dbUser.staff.isActive)

      if (revoked) {
        token.invalid = true
        token.role    = "" // ล้างสิทธิ์ → middleware redirect ออก
        return token
      }

      // sync ค่าล่าสุดจาก DB (สะท้อนการ promote/demote + เปลี่ยนชื่อ/อีเมล)
      token.role    = dbUser!.role
      token.name    = dbUser!.name
      token.email   = dbUser!.email
      token.invalid = false
      return token
    },

    async session({ session, token }) {
      // บัญชีถูกเพิกถอน → ส่ง session ที่ไม่มี user เพื่อให้ทุก guard ปฏิเสธ
      if (token.invalid) {
        return { ...session, user: undefined as unknown as typeof session.user }
      }
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

  session: {
    strategy:  "jwt",
    maxAge:    8 * 60 * 60, // อายุ session สูงสุด 8 ชม. (BUG-005)
    updateAge: 60 * 60,     // rotate token ทุก 1 ชม. ที่มีการใช้งาน
  },
  secret:  process.env.NEXTAUTH_SECRET,
}

export { getRedirectByRole } from "@/lib/routes"
