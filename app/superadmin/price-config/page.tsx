"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Activity, BedDouble, Clock, Crown, Loader2, LogOut,
  Plus, RefreshCw, TrendingUp, Users, X,
} from "lucide-react"

interface RoomTypeOption {
  id: string
  typeName: string
  basePrice: number
}

interface PriceConfig {
  id: string
  roomTypeId: string
  seasonName: string
  priceAmount: number
  startDate: string
  endDate: string
  priority: number
  isActive: boolean
  roomType: RoomTypeOption
}

interface FormState {
  roomTypeId: string
  seasonName: string
  priceAmount: string
  startDate: string
  endDate: string
  priority: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  roomTypeId: "",
  seasonName: "",
  priceAmount: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  priority: "1",
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

function PriceConfigModal({
  mode, initial, roomTypes, onClose, onSaved,
}: {
  mode: "add" | "edit"
  initial?: PriceConfig
  roomTypes: RoomTypeOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          roomTypeId: initial.roomTypeId,
          seasonName: initial.seasonName,
          priceAmount: String(initial.priceAmount),
          startDate: initial.startDate.slice(0, 10),
          endDate: initial.endDate.slice(0, 10),
          priority: String(initial.priority),
          isActive: initial.isActive,
        }
      : { ...EMPTY_FORM, roomTypeId: roomTypes[0]?.id ?? "" }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.roomTypeId || !form.seasonName || !form.priceAmount || !form.startDate || !form.endDate) {
      setError("All required fields must be filled")
      return
    }

    setSaving(true)
    setError("")
    try {
      const url = mode === "add" ? "/api/superadmin/price-configs" : `/api/superadmin/price-configs/${initial!.id}`
      const method = mode === "add" ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          priceAmount: Number(form.priceAmount),
          priority: Number(form.priority),
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
        <h2 className="text-[16px] font-bold text-gray-900 mb-5">{mode === "add" ? "Add Price Config" : "Edit Price Config"}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-600 font-semibold">Room Type *</label>
            <select value={form.roomTypeId} onChange={(event) => set("roomTypeId", event.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-purple-400">
              <option value="">Select room type</option>
              {roomTypes.map((item) => (
                <option key={item.id} value={item.id}>{item.typeName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-600 font-semibold">Season Name *</label>
            <input value={form.seasonName} onChange={(event) => set("seasonName", event.target.value)}
              placeholder="High Season"
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">Price *</label>
              <input type="number" value={form.priceAmount} onChange={(event) => set("priceAmount", event.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">Priority *</label>
              <input type="number" value={form.priority} onChange={(event) => set("priority", event.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">Start Date *</label>
              <input type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">End Date *</label>
              <input type="date" value={form.endDate} onChange={(event) => set("endDate", event.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-purple-400" />
            </div>
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

export default function PriceConfigPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [configs, setConfigs] = useState<PriceConfig[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: "add" | "edit"; item?: PriceConfig } | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role !== "SUPERADMIN") router.push("/unauthorized")
  }, [status, session, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [configRes, typeRes] = await Promise.all([
        fetch("/api/superadmin/price-configs?all=true"),
        fetch("/api/superadmin/room-types"),
      ])
      const [configData, typeData] = await Promise.all([configRes.json(), typeRes.json()])
      if (!configRes.ok) throw new Error(configData.error ?? "Failed to fetch price configs")
      if (!typeRes.ok) throw new Error(typeData.error ?? "Failed to fetch room types")
      setConfigs(Array.isArray(configData) ? configData : [])
      setRoomTypes(Array.isArray(typeData) ? typeData : [])
    } catch (err) {
      setConfigs([])
      setRoomTypes([])
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const timer = window.setTimeout(() => { void fetchData() }, 0)
    return () => window.clearTimeout(timer)
  }, [status, fetchData])

  async function deactivate(id: string) {
    if (!confirm("Deactivate this price config?")) return
    await fetch(`/api/superadmin/price-configs/${id}`, { method: "DELETE" })
    await fetchData()
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-purple-500" /></div>
  }

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <Sidebar active="/superadmin/price-config" />
      <main className="ml-[210px] flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">Price Config</h1>
            <p className="text-[12px] text-gray-400 mt-1">Seasonal pricing by room type. Higher priority wins.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><RefreshCw size={14} /></button>
            <button onClick={() => setModal({ mode: "add" })}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-[12px] font-semibold">
              <Plus size={13} /> Add Config
            </button>
          </div>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px_120px_80px_90px_120px] gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            {["Season", "Room Type", "Price", "Date Range", "Priority", "Status", ""].map((head) => (
              <p key={head} className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{head}</p>
            ))}
          </div>
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 size={24} className="text-purple-400 animate-spin" /></div>
          ) : configs.length === 0 ? (
            <div className="py-16 text-center text-gray-300 text-[13px]">No price configs found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {configs.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_140px_120px_120px_80px_90px_120px] gap-3 items-center px-5 py-3.5 hover:bg-gray-50/50">
                  <p className="text-[13px] font-medium text-gray-800">{item.seasonName}</p>
                  <p className="text-[12px] text-gray-500">{item.roomType.typeName}</p>
                  <p className="text-[12px] font-mono text-gray-700">{item.priceAmount.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-500">{item.startDate.slice(0, 10)} to {item.endDate.slice(0, 10)}</p>
                  <p className="text-[12px] text-gray-500">{item.priority}</p>
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
        <PriceConfigModal
          mode={modal.mode}
          initial={modal.item}
          roomTypes={roomTypes}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); void fetchData() }}
        />
      )}
    </div>
  )
}
