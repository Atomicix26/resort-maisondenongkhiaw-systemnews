"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Users, ShieldCheck, BedDouble, TrendingUp,
  LogOut, Crown, Search, RefreshCw, Loader2,
  UserCheck, UserX, ChevronDown, Clock, Activity,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────
type Role = "USER" | "ADMIN" | "SUPERADMIN"

interface UserItem {
  id: string; name: string|null; lastName: string|null
  email: string; phone: string|null; role: Role
  createdAt: string; deletedAt: string|null
  staff:  { id: string; position: string|null; isActive: boolean } | null
  _count: { bookings: number; reviews: number }
}

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

// ── Sidebar ──────────────────────────────────────────────────────
function Sidebar({ active }: { active: string }) {
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
          {[
            { icon: Activity,   label: "Dashboard",      path: "/superadmin/dashboard", active: active === "dashboard" },
            { icon: Users,      label: "Staff",          path: "/staff",                active: active === "staff"    },
            { icon: BedDouble,  label: "Room",           path: "/booking",              active: active === "rooms"    },
            { icon: BedDouble,  label: "Room Type",      path: "/superadmin/room-types", active: active === "roomTypes" },
            { icon: TrendingUp, label: "Price Config",   path: "/superadmin/price-config", active: active === "priceConfig" },
            { icon: Activity,   label: "Reports",        path: "/superadmin/reports",   active: active === "reports"  },
            { icon: Clock,      label: "Access Logs",    path: "/superadmin/logs",      active: active === "logs"     },
          ].map(({ icon: Icon, label, path, active: isActive }) => (
            <a key={path} href={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all
                ${isActive
                  ? "bg-white/10 text-white border-l-[3px] border-yellow-400"
                  : "text-white/60 hover:text-white hover:bg-white/5"}`}>
              <Icon size={15} className="shrink-0" /> {label}
            </a>
          ))}
        </nav>
      </div>
      <button onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 px-6 py-5 text-white/50 hover:text-white text-[12px] transition-colors border-t border-white/10">
        <LogOut size={14} /> ອອກຈາກລະບົບ
      </button>
    </aside>
  )
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

  const [stats,      setStats]      = useState<Stats|null>(null)
  const [users,      setUsers]      = useState<UserItem[]>([])
  const [loadStats,  setLoadStats]  = useState(true)
  const [loadUsers,  setLoadUsers]  = useState(true)
  const [search,     setSearch]     = useState("")
  const [filterRole, setFilterRole] = useState<Role|"ALL">("ALL")
  const [changing,   setChanging]   = useState<string|null>(null)
  const [openDrop,   setOpenDrop]   = useState<string|null>(null)

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

  const fetchUsers = useCallback(async () => {
    setLoadUsers(true)
    try {
      const q   = filterRole !== "ALL" ? `?role=${filterRole}` : ""
      const res = await fetch(`/api/superadmin/users${q}`)
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch { setUsers([]) }
    finally  { setLoadUsers(false) }
  }, [filterRole])

  useEffect(() => {
    if (status !== "authenticated") return
    const timer = window.setTimeout(() => { void fetchUsers() }, 0)
    return () => window.clearTimeout(timer)
  }, [status, fetchUsers])

  async function changeRole(userId: string, newRole: Role) {
    if (!confirm(`ປ່ຽນ role ເປັນ ${ROLE_CFG[newRole].label}?`)) return
    setChanging(userId)
    await fetch(`/api/superadmin/users/${userId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    setOpenDrop(null)
    await fetchUsers()
    setChanging(null)
  }

  async function softDelete(userId: string) {
    if (!confirm("ລຶບ user ນີ້?")) return
    setChanging(userId)
    await fetch(`/api/superadmin/users/${userId}`, { method: "DELETE" })
    await fetchUsers()
    setChanging(null)
  }

  const filtered = users.filter((u) => {
    if (!search) return true
    const full = `${u.name??""} ${u.lastName??""} ${u.email}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  const counts = {
    ALL:       users.length,
    USER:      users.filter((u) => u.role === "USER").length,
    ADMIN:     users.filter((u) => u.role === "ADMIN").length,
    SUPERADMIN:users.filter((u) => u.role === "SUPERADMIN").length,
  }

  if (status === "loading" || loadStats) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={28} className="text-purple-500 animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <Sidebar active="dashboard" />

      <main className="ml-[210px] flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} className="text-yellow-500" />
              <h1 className="text-[20px] font-bold text-gray-900">SuperAdmin Dashboard</h1>
            </div>
            <p className="text-[12px] text-gray-400">{session?.user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">ພາບລວມລະບົບ</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <StatCard icon={Users}      label="Users"       value={stats.totalUsers}    color="bg-blue-500"    />
              <StatCard icon={ShieldCheck}label="Admins"      value={stats.totalAdmins}   color="bg-purple-500"  />
              <StatCard icon={UserCheck}  label="Staff"       value={stats.totalStaff}    color="bg-indigo-500"  />
              <StatCard icon={BedDouble}  label="ຫ້ອງພັກ"    value={stats.totalRooms}    color="bg-emerald-500" />
              <StatCard icon={Activity}   label="ການຈອງ"     value={stats.totalBookings} color="bg-amber-500"   />
              <StatCard icon={TrendingUp} label="ລາຍໄດ້ລວມ"
                value={`${stats.totalRevenue.toLocaleString()} ₭`} color="bg-rose-500" />
            </div>
          </>
        )}

        {/* User Management */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">ຈັດການ Users ທັງໝົດ</p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ຄົ້ນຫາ..."
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 bg-white outline-none focus:border-purple-300 w-44" />
            </div>
            <button onClick={fetchUsers} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Role filter */}
        <div className="flex gap-2 mb-4">
          {(["ALL","USER","ADMIN","SUPERADMIN"] as const).map((r) => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors
                ${filterRole === r ? "bg-[#120B2E] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {r === "ALL" ? "ທັງໝົດ" : ROLE_CFG[r].label}
              <span className="ml-1.5 opacity-60">({counts[r]})</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_180px_100px_80px_80px_70px] gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            {["ຜູ້ໃຊ້","Email","Role","ການຈອງ","ລີວິວ",""].map((h, i) => (
              <p key={i} className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {loadUsers ? (
            <div className="py-16 flex justify-center"><Loader2 size={22} className="text-purple-400 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-300 text-[13px]">ບໍ່ມີຂໍ້ມູນ</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((u) => {
                const rc      = ROLE_CFG[u.role]
                const isSelf  = u.id === session?.user?.id
                const isLoading = changing === u.id
                return (
                  <div key={u.id}
                    className={`grid grid-cols-[1fr_180px_100px_80px_80px_70px] gap-2 items-center px-5 py-3.5
                      hover:bg-gray-50/50 transition-colors ${u.deletedAt ? "opacity-40" : ""}`}>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800">
                        {[u.name, u.lastName].filter(Boolean).join(" ") || "—"}
                        {isSelf && <span className="ml-2 text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">ທ່ານ</span>}
                      </p>
                      <p className="text-[10px] text-gray-400">{u.phone ?? "—"}</p>
                    </div>

                    <p className="text-[11px] text-gray-500 truncate">{u.email}</p>

                    <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${rc.bg} ${rc.color}`}>
                      {rc.label}
                    </span>

                    <p className="text-[12px] text-gray-500 text-center">{u._count.bookings}</p>
                    <p className="text-[12px] text-gray-500 text-center">{u._count.reviews}</p>

                    {/* Actions */}
                    <div className="relative flex justify-end">
                      {!isSelf && !u.deletedAt && (
                        <button disabled={isLoading}
                          onClick={() => setOpenDrop(openDrop === u.id ? null : u.id)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-50">
                          {isLoading ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      {openDrop === u.id && (
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                          <p className="px-4 py-1 text-[10px] text-gray-400 uppercase tracking-wider">ປ່ຽນ Role</p>
                          {(["USER","ADMIN","SUPERADMIN"] as Role[]).filter((r) => r !== u.role).map((r) => (
                            <button key={r} onClick={() => changeRole(u.id, r)}
                              className={`w-full text-left px-4 py-2 text-[12px] hover:bg-gray-50 font-medium ${ROLE_CFG[r].color}`}>
                              → {ROLE_CFG[r].label}
                            </button>
                          ))}
                          <div className="h-px bg-gray-100 mx-3 my-1" />
                          <button onClick={() => { setOpenDrop(null); softDelete(u.id) }}
                            className="w-full text-left px-4 py-2 text-[12px] text-red-500 hover:bg-red-50">
                            <UserX size={11} className="inline mr-1.5" />ລຶບ User
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Access Logs */}
        {stats?.recentLogs && stats.recentLogs.length > 0 && (
          <div className="mt-8">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Access Logs ລ່າສຸດ
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_120px_120px] gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                {["User","Role","Login","IP"].map((h, i) => (
                  <p key={i} className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</p>
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
                      <p className="text-[10px] text-gray-400">{log.user.email}</p>
                    </div>
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit
                      ${ROLE_CFG[log.userType]?.bg} ${ROLE_CFG[log.userType]?.color}`}>
                      {ROLE_CFG[log.userType]?.label}
                    </span>
                    <p className="text-[11px] text-gray-500">
                      {new Date(log.loginTime).toLocaleString("lo-LA", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">{log.ipAddress ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {openDrop && <div className="fixed inset-0 z-40" onClick={() => setOpenDrop(null)} />}
    </div>
  )
}
