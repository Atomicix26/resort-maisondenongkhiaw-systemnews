import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null

          const user = await prisma.user.findUnique({
            where:  { email: credentials.email },
            select: {
              id:        true,
              email:     true,
              name:      true,
              password:  true,
              role:      true,
              deletedAt: true,   
            },
          })

          if (!user) return null

          if (user.deletedAt) return null

          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) return null

          return { id: user.id, email: user.email, name: user.name, role: user.role }

        } catch (error) {
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
  secret: process.env.NEXTAUTH_SECRET,
}

export function getRedirectByRole(role: string): string {
  switch (role) {
    case "SUPERADMIN": return "/superadmin/dashboard"
    case "ADMIN":      return "/admin/dashboard"   
    default:           return "/profile"
  }
}