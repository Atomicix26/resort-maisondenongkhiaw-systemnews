"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Activity, BedDouble, Clock, Crown, Loader2, LogOut,
  Plus, RefreshCw, Search, TrendingUp, Users, X,
} from "lucide-react"

interface RoomType {
  id: string
  typeName: string
  description: string | null
  basePrice: number
  maxGuests: number
  amenities: string[]
  isActive: boolean
  _count: { rooms: number; priceConfigs: number }
}

interface FormState {
  typeName: string
  description: string
  basePrice: string
  maxGuests: string
  amenities: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  typeName: "",
  description: "",
  basePrice: "",
  maxGuests: "2",
  amenities: "",
  isActive: true,
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

function RoomTypeModal({
  mode, initial, onClose, onSaved,
}: {
  mode: "add" | "edit"
  initial?: RoomType
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          typeName: initial.typeName,
          description: initial.description ?? "",
          basePrice: String(initial.basePrice),
          maxGuests: String(initial.maxGuests),
          amenities: initial.amenities.join(", "),
          isActive: initial.isActive,
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.typeName || !form.basePrice || !form.maxGuests) {
      setError("typeName, basePrice and maxGuests are required")
      return
    }

    setSaving(true)
    setError("")
    try {
      const url = mode === "add" ? "/api/superadmin/room-types" : `/api/superadmin/room-types/${initial!.id}`
      const method = mode === "add" ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basePrice: Number(form.basePrice),
          maxGuests: Number(form.maxGuests),
          amenities: form.amenities,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed")
        return
      }
      onSaved()
    } catch {
      setError("Unexpected error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7 relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-300 hover:text-gray-600"><X size={18} /></button>
        <h2 className="text-[16px] font-bold text-gray-900 mb-5">{mode === "add" ? "Add Room Type" : "Edit Room Type"}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-600 font-semibold">Type Name *</label>
            <input value={form.typeName} onChange={(event) => set("typeName", event.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">Base Price *</label>
              <input type="number" value={form.basePrice} onChange={(event) => set("basePrice", event.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">Max Guests *</label>
              <input type="number" value={form.maxGuests} onChange={(event) => set("maxGuests", event.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-gray-600 font-semibold">Amenities</label>
            <input value={form.amenities} onChange={(event) => set("amenities", event.target.value)}
              placeholder="Wifi, Pool, Breakfast"
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400" />
          </div>
          <div>
            <label className="text-[11px] text-gray-600 font-semibold">Description</label>
            <textarea value={form.description} onChange={(event) => set("description", event.target.value)} rows={3}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-[12px] text-gray-600">
            <input type="checkbox" checked={form.isActive} onChange={(event) => set("isActive", event.target.checked)} />
            Active
          </label>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RoomTypesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [items, setItems] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState<{ mode: "add" | "edit"; item?: RoomType } | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role !== "SUPERADMIN") router.push("/unauthorized")
  }, [status, session, router])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/superadmin/room-types?all=true")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setItems([])
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const timer = window.setTimeout(() => { void fetchItems() }, 0)
    return () => window.clearTimeout(timer)
  }, [status, fetchItems])

  async function deactivate(id: string) {
    if (!confirm("Deactivate this room type?")) return
    await fetch(`/api/superadmin/room-types/${id}`, { method: "DELETE" })
    await fetchItems()
  }

  const filtered = items.filter((item) => {
    if (!search) return true
    return `${item.typeName} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase())
  })

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-purple-500" /></div>
  }

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <Sidebar active="/superadmin/room-types" />
      <main className="ml-[210px] flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">Room Type</h1>
            <p className="text-[12px] text-gray-400 mt-1">Manage room categories and base pricing.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchItems} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><RefreshCw size={14} /></button>
            <button onClick={() => setModal({ mode: "add" })}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-[12px] font-semibold">
              <Plus size={13} /> Add Type
            </button>
          </div>
        </div>

        <div className="relative mb-4 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Search type..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-[12px] text-gray-700 outline-none focus:border-purple-300" />
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_100px_100px_100px_120px] gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            {["Type", "Base Price", "Guests", "Rooms", "Status", ""].map((head) => (
              <p key={head} className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{head}</p>
            ))}
          </div>
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 size={24} className="text-purple-400 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-300 text-[13px]">No room types found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_120px_100px_100px_100px_120px] gap-3 items-center px-5 py-3.5 hover:bg-gray-50/50">
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">{item.typeName}</p>
                    <p className="text-[10px] text-gray-400 truncate">{item.amenities.join(", ") || item.description || "-"}</p>
                  </div>
                  <p className="text-[12px] font-mono text-gray-700">{item.basePrice.toLocaleString()}</p>
                  <p className="text-[12px] text-gray-500">{item.maxGuests}</p>
                  <p className="text-[12px] text-gray-500">{item._count.rooms}</p>
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setModal({ mode: "edit", item })}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-[11px] font-semibold text-blue-600 hover:bg-blue-100">Edit</button>
                    {item.isActive && (
                      <button onClick={() => deactivate(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-[11px] font-semibold text-red-500 hover:bg-red-100">Disable</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {modal && (
        <RoomTypeModal
          mode={modal.mode}
          initial={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); void fetchItems() }}
        />
      )}
    </div>
  )
}
