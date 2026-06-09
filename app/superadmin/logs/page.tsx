"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Activity, BedDouble, Clock, Crown, Loader2, LogOut,
  RefreshCw, TrendingUp, Users,
} from "lucide-react"

type Role = "USER" | "ADMIN" | "SUPERADMIN"

interface LogItem {
  id: string
  userType: Role
  ipAddress: string | null
  loginTime: string
  logoutTime: string | null
  user: { name: string | null; lastName: string | null; email: string; role: Role }
}

interface LogsPayload {
  logs: LogItem[]
  stats: { userType: Role; _count: { id: number } }[]
}

function Sidebar({ active }: { active: string }) {
  const nav = [
    { icon: Activity, label: "Dashboard", path: "/superadmin/dashboard" },
    { icon: Users, label: "Staff", path: "/staff" },
    { icon: BedDouble, label: "Room", path: "/booking" },
    { icon: BedDouble, label: "Room Type", path: "/superadmin/room-types" },
    { icon: TrendingUp, label: "Price Config", path: "/superadmin/price-config" },
    { icon: Activity, label: "Reports", path: "/superadmin/reports" },
    { icon: Clock, label: "Access Logs", path: "/superadmin/logs" },
  ]

  return (
    <aside className="w-[210px] min-h-screen bg-[#120B2E] flex flex-col justify-between fixed left-0 top-0 z-40">
      <div>
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2 mb-0.5">
            <Crown size={14} className="text-yellow-400" />
            <p className="text-white/50 text-[10px] uppercase tracking-wider">SuperAdmin</p>
          </div>
          <p className="text-white font-bold text-[14px]">Resort MDNK1</p>
        </div>
        <nav className="mt-3 px-3 space-y-0.5">
          {nav.map(({ icon: Icon, label, path }) => (
            <Link key={path} href={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all
                ${active === path
                  ? "bg-white/10 text-white border-l-[3px] border-yellow-400"
                  : "text-white/60 hover:text-white hover:bg-white/5"}`}>
              <Icon size={15} className="shrink-0" /> {label}
            </Link>
          ))}
        </nav>
      </div>
      <button onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 px-6 py-5 text-white/50 hover:text-white text-[12px] transition-colors border-t border-white/10">
        <LogOut size={14} /> Logout
      </button>
    </aside>
  )
}

export default function AccessLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [payload, setPayload] = useState<LogsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role !== "SUPERADMIN") router.push("/unauthorized")
  }, [status, session, router])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/superadmin/logs")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setPayload(data)
    } catch (err) {
      setPayload(null)
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const timer = window.setTimeout(() => { void fetchLogs() }, 0)
    return () => window.clearTimeout(timer)
  }, [status, fetchLogs])

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-purple-500" /></div>
  }

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <Sidebar active="/superadmin/logs" />
      <main className="ml-[210px] flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">Access Logs</h1>
            <p className="text-[12px] text-gray-400 mt-1">Latest login records for audit review.</p>
          </div>
          <button onClick={fetchLogs}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-purple-700">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

        <div className="grid grid-cols-3 gap-4 mb-5">
          {(["USER", "ADMIN", "SUPERADMIN"] as Role[]).map((role) => (
            <div key={role} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">{role}</p>
              <p className="text-[24px] font-bold text-gray-900 mt-2">
                {payload?.stats.find((item) => item.userType === role)?._count.id ?? 0}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_110px_170px_120px_170px] gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            {["User", "Role", "Login", "IP", "Logout"].map((head) => (
              <p key={head} className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{head}</p>
            ))}
          </div>
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 size={24} className="text-purple-400 animate-spin" /></div>
          ) : !payload || payload.logs.length === 0 ? (
            <div className="py-16 text-center text-gray-300 text-[13px]">No access logs found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {payload.logs.map((log) => (
                <div key={log.id} className="grid grid-cols-[1fr_110px_170px_120px_170px] gap-3 items-center px-5 py-3.5 hover:bg-gray-50/50">
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">
                      {[log.user.name, log.user.lastName].filter(Boolean).join(" ") || "-"}
                    </p>
                    <p className="text-[10px] text-gray-400">{log.user.email}</p>
                  </div>
                  <p className="text-[12px] text-gray-500">{log.userType}</p>
                  <p className="text-[12px] text-gray-600">{new Date(log.loginTime).toLocaleString()}</p>
                  <p className="text-[11px] font-mono text-gray-500">{log.ipAddress ?? "-"}</p>
                  <p className="text-[12px] text-gray-400">{log.logoutTime ? new Date(log.logoutTime).toLocaleString() : "-"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
