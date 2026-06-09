"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BedDouble, BookOpen, CalendarDays, LayoutDashboard,
  Loader2, LogOut, RefreshCw, Search, Star, Users,
} from "lucide-react"

type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED"

interface RoomStatusItem {
  id: string
  roomNumber: string | null
  name: string
  status: RoomStatus
  capacity: number
  roomType: { typeName: string } | null
  statusLogs: { changedAt: string; oldStatus: RoomStatus; newStatus: RoomStatus }[]
}

const STATUS_CFG: Record<RoomStatus, { label: string; color: string; dot: string }> = {
  AVAILABLE: { label: "Available", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  OCCUPIED: { label: "Occupied", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  MAINTENANCE: { label: "Maintenance", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  RESERVED: { label: "Reserved", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
}

function Sidebar({ active, role }: { active: string; role?: string }) {
  const nav = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ...(role === "SUPERADMIN"
      ? [
          { href: "/booking", icon: CalendarDays, label: "Rooms" },
          { href: "/staff", icon: Users, label: "Staff" },
        ]
      : []),
    { href: "/admin/room-status", icon: BedDouble, label: "Room Status" },
    { href: "/schedule", icon: BookOpen, label: "Bookings" },
    { href: "/review", icon: Star, label: "Reviews" },
  ]

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20">
      <div className="p-5 border-b border-gray-100">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Admin Panel</p>
        <p className="font-bold text-gray-900 text-sm mt-0.5">Resort MDNK1</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] transition-colors
              ${active === href ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
            <Icon size={14} /> {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={13} /> Logout
        </button>
      </div>
    </aside>
  )
}

export default function AdminRoomStatusPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [rooms, setRooms] = useState<RoomStatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [filter, setFilter] = useState<RoomStatus | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role === "USER") router.push("/unauthorized")
  }, [status, session, router])

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/room-status")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setRooms(Array.isArray(data) ? data : [])
    } catch (err) {
      setRooms([])
      setError(err instanceof Error ? err.message : "Failed to fetch room status")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const timer = window.setTimeout(() => { void fetchRooms() }, 0)
    return () => window.clearTimeout(timer)
  }, [status, fetchRooms])

  async function updateStatus(roomId: string, nextStatus: RoomStatus) {
    setSaving(roomId)
    setError("")
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to update")
      await fetchRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(null)
    }
  }

  const filtered = rooms
    .filter((room) => filter === "ALL" || room.status === filter)
    .filter((room) => {
      if (!search) return true
      const text = `${room.roomNumber ?? ""} ${room.name} ${room.roomType?.typeName ?? ""}`.toLowerCase()
      return text.includes(search.toLowerCase())
    })

  const counts = {
    ALL: rooms.length,
    AVAILABLE: rooms.filter((room) => room.status === "AVAILABLE").length,
    OCCUPIED: rooms.filter((room) => room.status === "OCCUPIED").length,
    MAINTENANCE: rooms.filter((room) => room.status === "MAINTENANCE").length,
    RESERVED: rooms.filter((room) => room.status === "RESERVED").length,
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-lao">
      <Sidebar active="/admin/room-status" role={session?.user?.role} />

      <main className="flex-1 ml-56 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">Room Status</h1>
            <p className="text-[12px] text-gray-400 mt-1">Update housekeeping and availability status.</p>
          </div>
          <button onClick={fetchRooms}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          {(["ALL", "AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED"] as const).map((item) => (
            <button key={item} onClick={() => setFilter(item)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium
                ${filter === item ? "bg-[#1E1040] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {item === "ALL" ? "All" : STATUS_CFG[item].label}
              <span className="ml-1.5 opacity-60">({counts[item]})</span>
            </button>
          ))}
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Search room..."
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 bg-white outline-none focus:border-blue-300 w-52" />
          </div>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[90px_1fr_150px_130px_180px] gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            {["Room", "Name", "Type", "Current", "Change Status"].map((head) => (
              <p key={head} className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{head}</p>
            ))}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 size={24} className="text-blue-400 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-300 text-[13px]">No rooms found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((room) => {
                const statusCfg = STATUS_CFG[room.status]
                return (
                  <div key={room.id} className="grid grid-cols-[90px_1fr_150px_130px_180px] gap-3 items-center px-5 py-3.5 hover:bg-gray-50/50">
                    <p className="text-[12px] font-mono text-gray-500">{room.roomNumber ?? "-"}</p>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800">{room.name}</p>
                      <p className="text-[10px] text-gray-400">Capacity {room.capacity}</p>
                    </div>
                    <p className="text-[12px] text-gray-500">{room.roomType?.typeName ?? "-"}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                    <select value={room.status} disabled={saving === room.id}
                      onChange={(event) => updateStatus(room.id, event.target.value as RoomStatus)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-blue-300 disabled:opacity-50">
                      {(Object.keys(STATUS_CFG) as RoomStatus[]).map((item) => (
                        <option key={item} value={item}>{STATUS_CFG[item].label}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
