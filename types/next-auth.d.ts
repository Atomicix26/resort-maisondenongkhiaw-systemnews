import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id:    string
    role:  string
  }

  interface Session {
    user: {
      id:    string
      name:  string
      email: string
      role:  string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:       string
    role:     string
    invalid?: boolean // true = บัญชีถูกลบ/ปิดใช้งาน/ลดสิทธิ์ → เพิกถอน session
  }
}