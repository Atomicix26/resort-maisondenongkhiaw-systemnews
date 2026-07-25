"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2, Users } from "lucide-react"
import { SuperAdminSidebar } from "@/components/superadmin-sidebar"
import { ProfileMenu } from "@/components/profile-menu"
import { UserManagement } from "@/components/user-management"


export default function SuperAdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role !== "SUPERADMIN") router.push("/unauthorized")
  }, [status, session, router])

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <SuperAdminSidebar />
      <main className="ml-[210px] flex-1 p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
          <Users size={18} className="text-blue-500" />
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">ຈັດການຜູ້ໃຊ້</h1>
            <p className="text-[12px] text-gray-500 mt-0.5">User Management — ປ່ຽນ role, ລຶບ ແລະ ເບິ່ງວັນທີສະໝັກ</p>
          </div>
          </div>
          <ProfileMenu />
        </div>
        <UserManagement />
      </main>
    </div>
  )
}
