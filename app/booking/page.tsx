"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BedDouble, CalendarCheck2, CalendarDays, Star, LogOut,
  LayoutDashboard, Plus, X, MoreHorizontal,
  ArrowUpDown, Loader2, RefreshCw, Search,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────
type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED"

interface Room {
  id: string; roomNumber: string | null; name: string
  description: string | null; price: number; capacity: number
  bedType: string | null; size: number | null; view: string | null
  status: RoomStatus; featured: boolean; isActive: boolean
  roomType: { typeName: string; basePrice: number } | null
  _count: { bookings: number; reviews: number }
}

interface FormState {
  roomNumber: string; name: string; description: string
  price: string; capacity: string; bedType: string
  size: string; view: string; status: RoomStatus; featured: boolean
}

const EMPTY_FORM: FormState = {
  roomNumber: "", name: "", description: "", price: "",
  capacity: "1", bedType: "", size: "", view: "",
  status: "AVAILABLE", featured: false,
}

// ── Status config ────────────────────────────────────────────────
const STATUS_CFG: Record<RoomStatus, { label: string; color: string; dot: string }> = {
  AVAILABLE:   { label: "ວ່າງ",      color: "bg-green-100 text-green-700",  dot: "bg-green-500"  },
  OCCUPIED:    { label: "ມີຜູ້ພັກ",  color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"   },
  MAINTENANCE: { label: "ສ້ອມແປງ",   color: "bg-orange-100 text-orange-700",dot: "bg-orange-500" },
  RESERVED:    { label: "ຈອງໄວ້",   color: "bg-purple-100 text-purple-700",dot: "bg-purple-500" },
}

// ── Sidebar (shared) ─────────────────────────────────────────────
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
            { icon: LayoutDashboard, label: "Dashboard",         path: "/admin/dashboard" },
            { icon: BedDouble,       label: "ຈັດການຫ້ອງ",       path: "/booking"         },
            { icon: CalendarCheck2,  label: "ຈັດການພະນັກງານ",   path: "/staff"           },
            { icon: CalendarDays,    label: "ຈັດການການຈອງ",     path: "/schedule"        },
            { icon: Star,            label: "ຈັດການລີວິວ",      path: "/review"          },
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
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 px-6 py-5 text-white/50 hover:text-white text-[12px] transition-colors border-t border-white/10">
        <LogOut size={14} /> ອອກຈາກລະບົບ
      </button>
    </aside>
  )
}

// ── Form Modal ───────────────────────────────────────────────────
function RoomModal({
  mode, initial, onClose, onSaved,
}: {
  mode: "add" | "edit"
  initial?: Room
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm]       = useState<FormState>(
    initial
      ? { roomNumber: initial.roomNumber ?? "", name: initial.name,
          description: initial.description ?? "", price: String(initial.price),
          capacity: String(initial.capacity), bedType: initial.bedType ?? "",
          size: initial.size ? String(initial.size) : "", view: initial.view ?? "",
          status: initial.status, featured: initial.featured }
      : EMPTY_FORM
  )
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState("")

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price || !form.capacity) {
      setError("ຊື່ຫ້ອງ, ລາຄາ ແລະ ຈຳນວນຄົນ ຈຳເປັນ"); return
    }
    setSaving(true); setError("")
    try {
      const url    = mode === "add" ? "/api/rooms" : `/api/rooms/${initial!.id}`
      const method = mode === "add" ? "POST" : "PATCH"
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: parseFloat(form.price), capacity: parseInt(form.capacity) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "ບໍ່ສຳເລັດ"); return }
      onSaved()
    } catch { setError("ເກີດຂໍ້ຜິດພາດ")
    } finally { setSaving(false) }
  }

  const field = (label: string, key: keyof FormState, type = "text", placeholder = "") => (
    <div>
      <label className="text-[11px] text-gray-600 font-semibold">{label}</label>
      <input type={type} value={form[key] as string}
        onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
        className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-300 hover:text-gray-600"><X size={18} /></button>
        <h2 className="text-[16px] font-bold text-gray-900 mb-5">
          {mode === "add" ? "➕ ເພີ່ມຫ້ອງໃໝ່" : "✏️ ແກ້ໄຂຂໍ້ມູນຫ້ອງ"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field("ເລກຫ້ອງ", "roomNumber", "text", "101")}
            {field("ຊື່ຫ້ອງ *", "name", "text", "Luxzy Room")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("ລາຄາ (₭) *", "price", "number", "500000")}
            {field("ຈຳນວນຄົນ *", "capacity", "number", "2")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("ປະເພດຕຽງ", "bedType", "text", "King Bed")}
            {field("ຂະໜາດ (m²)", "size", "number", "35")}
          </div>
          {field("ວິວ", "view", "text", "Mountain View")}
          <div>
            <label className="text-[11px] text-gray-600 font-semibold">ຄຳອະທິບາຍ</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">ສະຖານະ</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400">
                {(Object.keys(STATUS_CFG) as RoomStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)}
                  className="w-4 h-4 rounded" />
                <span className="text-[13px] text-gray-700">Featured ⭐</span>
              </label>
            </div>
          </div>
          {error && <p className="text-red-500 text-[12px]">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50">
              ຍົກເລີກ
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50">
              {saving ? "ກຳລັງບັນທຶກ..." : mode === "add" ? "ເພີ່ມຫ້ອງ" : "ບັນທຶກ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export default function BookingAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [rooms,       setRooms]       = useState<Room[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState("")
  const [filterSt,    setFilterSt]    = useState<RoomStatus | "ALL">("ALL")
  const [openDrop,    setOpenDrop]    = useState<string | null>(null)
  const [modal,       setModal]       = useState<{ mode: "add" | "edit"; room?: Room } | null>(null)
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [sortBy,      setSortBy]      = useState<"name" | "price" | "status">("name")

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role === "USER") router.push("/profile")
  }, [status, session, router])

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/rooms?all=true")
      const data = await res.json()
      setRooms(Array.isArray(data) ? data : [])
    } catch { setRooms([]) }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const timer = window.setTimeout(() => { void fetchRooms() }, 0)
    return () => window.clearTimeout(timer)
  }, [status, fetchRooms])

  async function handleDelete(id: string) {
    if (!confirm("ຢືນຢັນລຶບຫ້ອງນີ້?")) return
    setDeleting(id)
    const res  = await fetch(`/api/rooms/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setDeleting(null); return }
    await fetchRooms()
    setDeleting(null)
  }

  async function quickStatus(room: Room, newStatus: RoomStatus) {
    await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    await fetchRooms()
    setOpenDrop(null)
  }

  // Filter + sort
  const filtered = rooms
    .filter((r) => filterSt === "ALL" || r.status === filterSt)
    .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase())
      || (r.roomNumber ?? "").includes(search))
    .sort((a, b) => {
      if (sortBy === "price")  return a.price - b.price
      if (sortBy === "status") return a.status.localeCompare(b.status)
      return a.name.localeCompare(b.name)
    })

  const counts = {
    ALL:         rooms.length,
    AVAILABLE:   rooms.filter((r) => r.status === "AVAILABLE").length,
    OCCUPIED:    rooms.filter((r) => r.status === "OCCUPIED").length,
    MAINTENANCE: rooms.filter((r) => r.status === "MAINTENANCE").length,
    RESERVED:    rooms.filter((r) => r.status === "RESERVED").length,
  }

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={28} className="text-blue-500 animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <Sidebar active="/booking" />

      <main className="ml-[210px] flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
          <h1 className="text-[14px] font-bold text-gray-900">ຈັດການຂໍ້ມູນຫ້ອງ</h1>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400">{session?.user?.name}</span>
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold">
              {session?.user?.name?.[0] ?? "A"}
            </div>
          </div>
        </header>

        <div className="flex-1 p-8">
          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {(["ALL", "AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED"] as const).map((s) => (
              <button key={s} onClick={() => setFilterSt(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors
                  ${filterSt === s ? "bg-[#1E1040] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {s === "ALL" ? "ທັງໝົດ" : STATUS_CFG[s].label}
                <span className="ml-1.5 opacity-60">({counts[s]})</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="ຄົ້ນຫາຫ້ອງ..." 
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 bg-white outline-none focus:border-blue-300 w-44" />
              </div>
              <button onClick={fetchRooms} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                <RefreshCw size={13} />
              </button>
              <button onClick={() => setModal({ mode: "add" })}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all active:scale-95">
                <Plus size={13} /> ເພີ່ມຫ້ອງ
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Head */}
            <div className="grid grid-cols-[60px_1fr_120px_100px_80px_80px_90px] gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              {[
                { label: "ຫ້ອງ",    key: null         },
                { label: "ຊື່ຫ້ອງ", key: "name"       },
                { label: "ລາຄາ ₭",  key: "price"      },
                { label: "ສະຖານະ",  key: "status"     },
                { label: "ຄົນ",     key: null         },
                { label: "ການຈອງ",  key: null         },
                { label: "",        key: null         },
              ].map(({ label, key }, i) => (
                <button key={i}
                  onClick={() => key && setSortBy(key as typeof sortBy)}
                  className={`flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-left
                    ${key ? "hover:text-gray-800 cursor-pointer" : "cursor-default"}`}>
                  {label} {key && <ArrowUpDown size={9} className="text-gray-400" />}
                </button>
              ))}
            </div>

            {/* Body */}
            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 size={24} className="text-blue-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-300 text-[13px]">ບໍ່ມີຂໍ້ມູນ</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((room) => {
                  const st = STATUS_CFG[room.status]
                  return (
                    <div key={room.id}
                      className="grid grid-cols-[60px_1fr_120px_100px_80px_80px_90px] gap-2 items-center px-5 py-3 hover:bg-gray-50/50 transition-colors">
                      {/* เลขห้อง */}
                      <div>
                        <p className="text-[11px] font-mono text-gray-500">{room.roomNumber ?? "—"}</p>
                        {room.featured && <span className="text-[9px] text-amber-500">⭐</span>}
                      </div>

                      {/* ชื่อ */}
                      <div>
                        <p className="text-[13px] font-medium text-gray-800">{room.name}</p>
                        {room.roomType && (
                          <p className="text-[10px] text-gray-400">{room.roomType.typeName}</p>
                        )}
                      </div>

                      {/* ราคา */}
                      <p className="text-[13px] font-semibold text-gray-700 font-mono">
                        {Number(room.price).toLocaleString()}
                      </p>

                      {/* status */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </div>

                      {/* capacity */}
                      <p className="text-[12px] text-gray-500">{room.capacity} ຄົນ</p>

                      {/* bookings count */}
                      <p className="text-[12px] text-gray-500">{room._count.bookings} ຄັ້ງ</p>

                      {/* actions */}
                      <div className="relative flex justify-end">
                        <button
                          onClick={() => setOpenDrop(openDrop === room.id ? null : room.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <MoreHorizontal size={16} />
                        </button>
                        {openDrop === room.id && (
                          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                            <button onClick={() => { setModal({ mode: "edit", room }); setOpenDrop(null) }}
                              className="w-full text-left px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                              ✏️ ແກ້ໄຂ
                            </button>
                            <div className="h-px bg-gray-100 mx-3 my-1" />
                            <p className="px-4 py-1 text-[10px] text-gray-400 uppercase tracking-wider">ປ່ຽນສະຖານະ</p>
                            {(Object.keys(STATUS_CFG) as RoomStatus[]).filter((s) => s !== room.status).map((s) => (
                              <button key={s} onClick={() => quickStatus(room, s)}
                                className="w-full text-left px-4 py-2 text-[12px] text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${STATUS_CFG[s].dot}`} />
                                {STATUS_CFG[s].label}
                              </button>
                            ))}
                            <div className="h-px bg-gray-100 mx-3 my-1" />
                            <button onClick={() => { setOpenDrop(null); handleDelete(room.id) }}
                              disabled={deleting === room.id}
                              className="w-full text-left px-4 py-2 text-[12px] text-red-500 hover:bg-red-50 disabled:opacity-50">
                              🗑️ ລຶບຫ້ອງ
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
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <RoomModal
          mode={modal.mode}
          initial={modal.room}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchRooms() }}
        />
      )}

      {openDrop && <div className="fixed inset-0 z-40" onClick={() => setOpenDrop(null)} />}
    </div>
  )
}
