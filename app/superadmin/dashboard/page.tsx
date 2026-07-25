"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Users, ShieldCheck, BedDouble, Crown, Loader2, UserCheck,
} from "lucide-react"
import { SuperAdminSidebar } from "@/components/superadmin-sidebar"
import { ProfileMenu } from "@/components/profile-menu"
import { UserManagement } from "@/components/user-management"
import { useLanguage } from "@/components/language-provider"

// ── Types ────────────────────────────────────────────────────────
type Role = "USER" | "ADMIN" | "SUPERADMIN"

interface Stats {
  totalUsers: number; totalAdmins: number; totalStaff: number
  totalRooms: number; totalBookings: number; totalRevenue: number
  recentLogs: LogItem[]
}

interface LogItem {
  id: string; userType: Role; ipAddress: string|null
  loginTime: string; logoutTime: string|null
  user: { name: string|null; lastName: string|null; email: string; role: Role }
}

const ROLE_CFG: Record<Role, { label: string; color: string; bg: string }> = {
  USER:       { label: "User",       color: "text-gray-600",   bg: "bg-gray-100"   },
  ADMIN:      { label: "Admin",      color: "text-blue-700",   bg: "bg-blue-100"   },
  SUPERADMIN: { label: "SuperAdmin", color: "text-purple-700", bg: "bg-purple-100" },
}

// ── Stat Card ────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string|number; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} mb-3`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-[24px] font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-[12px] text-gray-500 mt-1">{label}</p>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()

  const [stats,      setStats]      = useState<Stats|null>(null)
  const [loadStats,  setLoadStats]  = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role !== "SUPERADMIN") router.push("/unauthorized")
  }, [status, session, router])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/superadmin/stats")
      .then((r) => r.json()).then(setStats).catch(console.error)
      .finally(() => setLoadStats(false))
  }, [status])

  if (status === "loading" || loadStats) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={28} className="text-blue-500 animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <SuperAdminSidebar />

      <main className="ml-[210px] flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} className="text-yellow-500" />
              <h1 className="text-[20px] font-bold text-gray-900">{t("superAdminDashboard")}</h1>
            </div>
            <p className="text-[12px] text-gray-500">{session?.user?.email}</p>
          </div>
          <ProfileMenu />
        </div>

        {/* Stats */}
        {stats && (
          <>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("systemOverview")}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users}      label={t("users")}     value={stats.totalUsers}  color="bg-blue-500"    />
              <StatCard icon={ShieldCheck}label={t("admins")}    value={stats.totalAdmins} color="bg-purple-500"  />
              <StatCard icon={UserCheck}  label={t("staff")}     value={stats.totalStaff}  color="bg-indigo-500"  />
              <StatCard icon={BedDouble}  label={t("rooms")}  value={stats.totalRooms}  color="bg-emerald-500" />
            </div>
          </>
        )}

        {/* User Management (shared with /superadmin/users) */}
        <UserManagement />

        {/* Recent Access Logs */}
        {stats?.recentLogs && stats.recentLogs.length > 0 && (
          <div className="mt-8">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {t("latestAccessLogs")}
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_120px_120px] gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                {[t("users"), t("role"), t("login"), t("ipAddress")].map((h, i) => (
                  <p key={i} className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-gray-50">
                {stats.recentLogs.map((log) => (
                  <div key={log.id}
                    className="grid grid-cols-[1fr_120px_120px_120px] gap-2 items-center px-5 py-3 hover:bg-gray-50/50">
                    <div>
                      <p className="text-[12px] font-medium text-gray-800">
                        {[log.user.name, log.user.lastName].filter(Boolean).join(" ") || "—"}
                      </p>
                      <p className="text-[11px] text-gray-500">{log.user.email}</p>
                    </div>
                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit
                      ${ROLE_CFG[log.userType]?.bg} ${ROLE_CFG[log.userType]?.color}`}>
                      {ROLE_CFG[log.userType]?.label}
                    </span>
                    <p className="text-[11px] text-gray-500">
                      {new Date(log.loginTime).toLocaleString("lo-LA", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">{log.ipAddress ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
