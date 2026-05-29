"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BedDouble, CalendarCheck2, CalendarDays, Star, LogOut,
  LayoutDashboard, Plus, X, Pencil, Trash2,
  ArrowUpDown, Loader2, RefreshCw, Search, ShieldCheck,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────
type StaffRole = "STAFF" | "MANAGER" | "ADMIN"

interface StaffItem {
  id:        string
  position:  string | null
  role:      StaffRole
  salary:    number | null
  startDate: string
  isActive:  boolean
  user: {
    id: string; name: string | null; lastName: string | null
    email: string; phone: string | null; createdAt: string
  }
}

interface FormState {
  name: string; lastName: string; email: string; phone: string
  password: string; position: string; role: StaffRole
  salary: string; startDate: string
}

const EMPTY_FORM: FormState = {
  name: "", lastName: "", email: "", phone: "",
  password: "", position: "", role: "STAFF",
  salary: "", startDate: new Date().toISOString().split("T")[0],
}

const ROLE_CFG: Record<StaffRole, { label: string; color: string }> = {
  STAFF:   { label: "ພະນັກງານ", color: "bg-gray-100 text-gray-600"    },
  MANAGER: { label: "ຜູ້ຈັດການ", color: "bg-blue-100 text-blue-700"   },
  ADMIN:   { label: "ແອດມິນ",   color: "bg-purple-100 text-purple-700" },
}

// ── Sidebar ──────────────────────────────────────────────────────
function Sidebar({ active }: { active: string }) {
  return (
    <aside className="w-[210px] min-h-screen bg-[#1E1040] flex flex-col justify-between fixed left-0 top-0 z-40">
      <div>
        <div className="px-6 py-5 border-b border-white/10">
          <p className="text-white/50 text-[10px] uppercase tracking-wider">Admin Panel</p>
          <p className="text-white font-bold text-[14px] mt-0.5">Resort MDNK1</p>
        </div>
        <nav className="mt-3 px-3 space-y-0.5">
          {[
            { icon: LayoutDashboard, label: "Dashboard",        path: "/admin/dashboard" },
            { icon: BedDouble,       label: "ຈັດການຫ້ອງ",      path: "/booking"         },
            { icon: CalendarCheck2,  label: "ຈັດການພະນັກງານ",  path: "/staff"           },
            { icon: CalendarDays,    label: "ຈັດການການຈອງ",    path: "/schedule"        },
            { icon: Star,            label: "ຈັດການລີວິວ",     path: "/review"          },
          ].map(({ icon: Icon, label, path }) => (
            <Link key={path} href={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all
                ${active === path
                  ? "bg-white/10 text-white border-l-[3px] border-pink-400"
                  : "text-white/60 hover:text-white hover:bg-white/5"}`}>
              <Icon size={15} className="shrink-0" /> {label}
            </Link>
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

// ── Staff Modal ──────────────────────────────────────────────────
function StaffModal({
  mode, initial, onClose, onSaved,
}: {
  mode: "add" | "edit"
  initial?: StaffItem
  onClose: () => void
  onSaved: () => void
}) {
  const [form,   setForm]   = useState<FormState>(
    initial
      ? {
          name:      initial.user.name     ?? "",
          lastName:  initial.user.lastName ?? "",
          email:     initial.user.email,
          phone:     initial.user.phone    ?? "",
          password:  "",
          position:  initial.position      ?? "",
          role:      initial.role,
          salary:    initial.salary ? String(initial.salary) : "",
          startDate: initial.startDate.split("T")[0],
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")
  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || (mode === "add" && !form.password)) {
      setError("ຊື່, Email ແລະ ລະຫັດຜ່ານ ຈຳເປັນ"); return
    }
    setSaving(true); setError("")
    try {
      const url    = mode === "add" ? "/api/staff" : `/api/staff/${initial!.id}`
      const method = mode === "add" ? "POST" : "PATCH"
      const res  = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salary: form.salary ? parseFloat(form.salary) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "ບໍ່ສຳເລັດ"); return }
      onSaved()
    } catch { setError("ເກີດຂໍ້ຜິດພາດ")
    } finally { setSaving(false) }
  }

  const inp = (label: string, key: keyof FormState, type = "text", placeholder = "", required = false) => (
    <div>
      <label className="text-[11px] text-gray-600 font-semibold">{label}{required && " *"}</label>
      <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-300 hover:text-gray-600"><X size={18} /></button>
        <h2 className="text-[16px] font-bold text-gray-900 mb-5">
          {mode === "add" ? "➕ ເພີ່ມພະນັກງານໃໝ່" : "✏️ ແກ້ໄຂຂໍ້ມູນພະນັກງານ"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {inp("ຊື່", "name", "text", "ສົມໃຈ", true)}
            {inp("ນາມສະກຸນ", "lastName", "text", "ວົງຄຳ")}
          </div>
          {inp("Email", "email", "email", "staff@resort.com", true)}
          <div className="grid grid-cols-2 gap-3">
            {inp("ເບີໂທ", "phone", "tel", "020xxxxxxxx")}
            {inp("ລະຫັດຜ່ານ" + (mode === "edit" ? " (ຂ້າມໄດ້)" : ""), "password", "password", "••••••••", mode === "add")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {inp("ຕຳແໜ່ງ", "position", "text", "Front Desk")}
            {inp("ເງິນເດືອນ (₭)", "salary", "number", "3000000")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">ບົດບາດ</label>
              <select value={form.role} onChange={(e) => set("role", e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400">
                {(Object.keys(ROLE_CFG) as StaffRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_CFG[r].label}</option>
                ))}
              </select>
            </div>
            {inp("ວັນທີເລີ່ມງານ", "startDate", "date")}
          </div>

          {mode === "add" && (
            <div className="bg-blue-50 rounded-lg p-3 text-[11px] text-blue-700 flex items-start gap-2">
              <ShieldCheck size={13} className="mt-0.5 flex-shrink-0" />
              ລະບົບຈະສ້າງ User account (role: ADMIN) ໃຫ້ພະນັກງານນີ້ອັດຕະໂນມັດ
            </div>
          )}

          {error && <p className="text-red-500 text-[12px]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50">
              ຍົກເລີກ
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50">
              {saving ? "ກຳລັງບັນທຶກ..." : mode === "add" ? "ເພີ່ມພະນັກງານ" : "ບັນທຶກ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export default function StaffPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [staff,       setStaff]       = useState<StaffItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState("")
  const [filterRole,  setFilterRole]  = useState<StaffRole | "ALL">("ALL")
  const [modal,       setModal]       = useState<{ mode: "add" | "edit"; item?: StaffItem } | null>(null)
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState(false)
  const [sortBy,      setSortBy]      = useState<"name" | "role" | "startDate">("name")

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role === "USER") router.push("/profile")
  }, [status, session, router])

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/staff")
      const data = await res.json()
      setStaff(Array.isArray(data) ? data : [])
    } catch { setStaff([]) }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { if (status === "authenticated") fetchStaff() }, [status, fetchStaff])

  async function handleDelete(id: string) {
    setDeleting(true)
    const res  = await fetch(`/api/staff/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setDeleting(false); return }
    setConfirmDel(null)
    setDeleting(false)
    await fetchStaff()
  }

  const filtered = staff
    .filter((s) => filterRole === "ALL" || s.role === filterRole)
    .filter((s) => {
      if (!search) return true
      const full = `${s.user.name ?? ""} ${s.user.lastName ?? ""} ${s.user.email}`.toLowerCase()
      return full.includes(search.toLowerCase())
    })
    .sort((a, b) => {
      if (sortBy === "role")      return a.role.localeCompare(b.role)
      if (sortBy === "startDate") return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      const an = `${a.user.name ?? ""} ${a.user.lastName ?? ""}`.trim()
      const bn = `${b.user.name ?? ""} ${b.user.lastName ?? ""}`.trim()
      return an.localeCompare(bn)
    })

  const counts = {
    ALL:     staff.length,
    STAFF:   staff.filter((s) => s.role === "STAFF").length,
    MANAGER: staff.filter((s) => s.role === "MANAGER").length,
    ADMIN:   staff.filter((s) => s.role === "ADMIN").length,
  }

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={28} className="text-blue-500 animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <Sidebar active="/staff" />

      <main className="ml-[210px] flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
          <h1 className="text-[14px] font-bold text-gray-900">ຈັດການຂໍ້ມູນພະນັກງານ</h1>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400">{session?.user?.name}</span>
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-[11px] font-bold">
              {session?.user?.name?.[0] ?? "A"}
            </div>
          </div>
        </header>

        <div className="flex-1 p-8">
          {/* Filter + Search */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {(["ALL", "STAFF", "MANAGER", "ADMIN"] as const).map((r) => (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors
                  ${filterRole === r ? "bg-[#1E1040] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {r === "ALL" ? "ທັງໝົດ" : ROLE_CFG[r].label}
                <span className="ml-1.5 opacity-60">({counts[r]})</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="ຄົ້ນຫາພະນັກງານ..."
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 bg-white outline-none focus:border-blue-300 w-48" />
              </div>
              <button onClick={fetchStaff} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                <RefreshCw size={13} />
              </button>
              <button onClick={() => setModal({ mode: "add" })}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all active:scale-95">
                <Plus size={13} /> ເພີ່ມພະນັກງານ
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Head */}
            <div className="grid grid-cols-[50px_1fr_160px_130px_120px_110px_90px] gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              {[
                { label: "#",          key: null        },
                { label: "ຊື່-ນາມສະກຸນ", key: "name"    },
                { label: "ຕຳແໜ່ງ",     key: null        },
                { label: "ບົດບາດ",      key: "role"      },
                { label: "ວັນທີເລີ່ມ",  key: "startDate" },
                { label: "ເງິນເດືອນ ₭", key: null        },
                { label: "",           key: null        },
              ].map(({ label, key }, i) => (
                <button key={i} onClick={() => key && setSortBy(key as typeof sortBy)}
                  className={`flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left
                    ${key ? "hover:text-gray-800 cursor-pointer" : "cursor-default"}`}>
                  {label} {key && <ArrowUpDown size={9} className="text-gray-400" />}
                </button>
              ))}
            </div>

            {/* Body */}
            {loading ? (
              <div className="py-16 flex justify-center"><Loader2 size={24} className="text-blue-400 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-300 text-[13px]">ບໍ່ມີຂໍ້ມູນ</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((s, i) => {
                  const fullName = [s.user.name, s.user.lastName].filter(Boolean).join(" ") || "—"
                  const roleCfg  = ROLE_CFG[s.role]
                  const startFmt = new Date(s.startDate).toLocaleDateString("lo-LA", { year: "numeric", month: "short", day: "2-digit" })
                  return (
                    <div key={s.id}
                      className="grid grid-cols-[50px_1fr_160px_130px_120px_110px_90px] gap-2 items-center px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <p className="text-[11px] text-gray-400 font-mono">{String(i + 1).padStart(2, "0")}</p>

                      <div>
                        <p className="text-[13px] font-medium text-gray-800">{fullName}</p>
                        <p className="text-[10px] text-gray-400">{s.user.email}</p>
                      </div>

                      <p className="text-[12px] text-gray-500">{s.position ?? "—"}</p>

                      <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${roleCfg.color}`}>
                        {roleCfg.label}
                      </span>

                      <p className="text-[12px] text-gray-500">{startFmt}</p>

                      <p className="text-[12px] font-medium text-gray-700 font-mono">
                        {s.salary ? Number(s.salary).toLocaleString() : "—"}
                      </p>

                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal({ mode: "edit", item: s })}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[11px] font-semibold transition-all">
                          <Pencil size={11} /> ແກ້
                        </button>
                        <button onClick={() => setConfirmDel(s.id)}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <StaffModal
          mode={modal.mode}
          initial={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchStaff() }}
        />
      )}

      {/* Confirm Delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 text-center">
            <div className="text-3xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-800 text-[15px] mb-2">ຢືນຢັນການລຶບ</h3>
            <p className="text-gray-400 text-[12px] mb-1">ພະນັກງານຈະຖືກ deactivate</p>
            <p className="text-gray-400 text-[11px] mb-6">(ຂໍ້ມູນຍັງຢູ່ — ບໍ່ລຶບຖາວອນ)</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDel(null)} disabled={deleting}
                className="px-5 py-2 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                ຍົກເລີກ
              </button>
              <button onClick={() => handleDelete(confirmDel)} disabled={deleting}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[12px] font-bold disabled:opacity-50">
                {deleting ? "ກຳລັງລຶບ..." : "ລຶບ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}