"use client"

// Shared SuperAdmin user-management table.
// Used by both the dashboard and the dedicated /superadmin/users page so the
// role-change / soft-delete / search logic lives in exactly one place.

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Search, RefreshCw, Loader2, UserX, ChevronDown } from "lucide-react"
import { TranslationKey, useLanguage } from "@/components/language-provider"

type Role = "USER" | "ADMIN" | "SUPERADMIN"

interface UserItem {
  id: string; name: string | null; lastName: string | null
  email: string; phone: string | null; role: Role
  createdAt: string; deletedAt: string | null
  staff: { id: string; position: string | null; isActive: boolean } | null
  _count: { bookings: number; reviews: number }
}

const ROLE_CFG: Record<Role, { labelKey: TranslationKey; color: string; bg: string }> = {
  USER:       { labelKey: "userRole",       color: "text-gray-600",   bg: "bg-gray-100"   },
  ADMIN:      { labelKey: "adminRole",      color: "text-blue-700",   bg: "bg-blue-100"   },
  SUPERADMIN: { labelKey: "superAdminRole", color: "text-purple-700", bg: "bg-purple-100" },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("lo-LA", { year: "numeric", month: "short", day: "2-digit" })
}

export function UserManagement() {
  const { data: session } = useSession()
  const { t } = useLanguage()

  const [users,      setUsers]      = useState<UserItem[]>([])
  const [loadUsers,  setLoadUsers]  = useState(true)
  const [search,     setSearch]     = useState("")
  const [filterRole, setFilterRole] = useState<Role | "ALL">("ALL")
  const [changing,   setChanging]   = useState<string | null>(null)
  const [openDrop,   setOpenDrop]   = useState<string | null>(null)

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
    const timer = window.setTimeout(() => { void fetchUsers() }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchUsers])

  async function changeRole(userId: string, newRole: Role) {
    if (!confirm(`${t("confirmChangeRole")} ${t(ROLE_CFG[newRole].labelKey)}?`)) return
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
    if (!confirm(t("confirmDeleteUser"))) return
    setChanging(userId)
    await fetch(`/api/superadmin/users/${userId}`, { method: "DELETE" })
    await fetchUsers()
    setChanging(null)
  }

  const filtered = users.filter((u) => {
    if (!search) return true
    const full = `${u.name ?? ""} ${u.lastName ?? ""} ${u.email}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  const counts = {
    ALL:        users.length,
    USER:       users.filter((u) => u.role === "USER").length,
    ADMIN:      users.filter((u) => u.role === "ADMIN").length,
    SUPERADMIN: users.filter((u) => u.role === "SUPERADMIN").length,
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t("manageAllUsers")}</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາ..."
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 bg-white outline-none focus:border-blue-300 w-44" />
          </div>
          <button onClick={fetchUsers} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Role filter */}
      <div className="flex gap-2 mb-4">
        {(["ALL", "USER", "ADMIN", "SUPERADMIN"] as const).map((r) => (
          <button key={r} onClick={() => setFilterRole(r)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors
              ${filterRole === r ? "bg-[#071A33] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {r === "ALL" ? t("all") : t(ROLE_CFG[r].labelKey)}
            <span className="ml-1.5 opacity-60">({counts[r]})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_180px_110px_110px_60px] gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          {[t("users"), t("email"), t("joinedAt"), t("role"), ""].map((h, i) => (
            <p key={i} className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</p>
          ))}
        </div>

        {loadUsers ? (
          <div className="py-16 flex justify-center"><Loader2 size={22} className="text-blue-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-[13px]">{t("noData")}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((u) => {
              const rc        = ROLE_CFG[u.role]
              const isSelf    = u.id === session?.user?.id
              const isLoading = changing === u.id
              return (
                <div key={u.id}
                  className={`grid grid-cols-[1fr_180px_110px_110px_60px] gap-2 items-center px-5 py-3.5
                    hover:bg-gray-50/50 transition-colors ${u.deletedAt ? "opacity-40" : ""}`}>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">
                      {[u.name, u.lastName].filter(Boolean).join(" ") || "—"}
                      {isSelf && <span className="ml-2 text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">{t("you")}</span>}
                    </p>
                    <p className="text-[11px] text-gray-500">{u.phone ?? "—"}</p>
                  </div>

                  <p className="text-[11px] text-gray-500 truncate">{u.email}</p>

                  <p className="text-[11px] text-gray-500">{fmtDate(u.createdAt)}</p>

                  <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-fit ${rc.bg} ${rc.color}`}>
                    {t(rc.labelKey)}
                  </span>

                  {/* Actions */}
                  <div className="relative flex justify-end">
                    {!isSelf && !u.deletedAt && (
                      <button disabled={isLoading}
                        onClick={() => setOpenDrop(openDrop === u.id ? null : u.id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50">
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={14} />}
                      </button>
                    )}
                    {openDrop === u.id && (
                      <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                        <p className="px-4 py-1 text-[11px] text-gray-500 uppercase tracking-wider">{t("changeRole")}</p>
                        {(["USER", "ADMIN", "SUPERADMIN"] as Role[]).filter((r) => r !== u.role).map((r) => (
                          <button key={r} onClick={() => changeRole(u.id, r)}
                            className={`w-full text-left px-4 py-2 text-[12px] hover:bg-gray-50 font-medium ${ROLE_CFG[r].color}`}>
                            → {t(ROLE_CFG[r].labelKey)}
                          </button>
                        ))}
                        <div className="h-px bg-gray-100 mx-3 my-1" />
                        <button onClick={() => { setOpenDrop(null); softDelete(u.id) }}
                          className="w-full text-left px-4 py-2 text-[12px] text-red-500 hover:bg-red-50">
                          <UserX size={11} className="inline mr-1.5" />{t("deleteUser")}
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

      {openDrop && <div className="fixed inset-0 z-40" onClick={() => setOpenDrop(null)} />}
    </>
  )
}
