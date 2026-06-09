"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Activity, BedDouble, Clock, Crown, Loader2, LogOut,
  RefreshCw, TrendingUp, Users,
} from "lucide-react"

interface ReportData {
  range: { from: string; to: string }
  summary: {
    totalBookings: number
    totalRevenue: number
    averageBookingValue: number
    totalUsers: number
    totalStaff: number
  }
  bookingStatus: { status: string; count: number }[]
  paymentStatus: { status: string; count: number }[]
  roomStatus: { status: string; count: number }[]
  topRooms: { roomId: string; roomName: string; bookings: number; revenue: number }[]
  dailyRevenue: { date: string; revenue: number }[]
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <p className="text-[11px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-[24px] font-bold text-gray-900 mt-2">{value}</p>
    </div>
  )
}

export default function SuperAdminReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [from, setFrom] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role !== "SUPERADMIN") router.push("/unauthorized")
  }, [status, session, router])

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const q = new URLSearchParams({ from, to })
      const res = await fetch(`/api/superadmin/reports?${q.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed")
      setData(json)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    if (status !== "authenticated") return
    const timer = window.setTimeout(() => { void fetchReports() }, 0)
    return () => window.clearTimeout(timer)
  }, [status, fetchReports])

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-purple-500" /></div>
  }

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <Sidebar active="/superadmin/reports" />
      <main className="ml-[210px] flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">Reports</h1>
            <p className="text-[12px] text-gray-400 mt-1">Booking, revenue, room status and payment summary.</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none" />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none" />
            <button onClick={fetchReports}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-purple-700">
              <RefreshCw size={13} /> Run
            </button>
          </div>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 size={28} className="text-purple-400 animate-spin" /></div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard label="Bookings" value={data.summary.totalBookings} />
              <StatCard label="Revenue" value={`${data.summary.totalRevenue.toLocaleString()} kip`} />
              <StatCard label="Average Booking" value={`${Math.round(data.summary.averageBookingValue).toLocaleString()} kip`} />
              <StatCard label="Users" value={data.summary.totalUsers} />
              <StatCard label="Staff" value={data.summary.totalStaff} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
              <SummaryTable title="Booking Status" rows={data.bookingStatus.map((item) => [item.status, item.count])} />
              <SummaryTable title="Payment Status" rows={data.paymentStatus.map((item) => [item.status, item.count])} />
              <SummaryTable title="Room Status" rows={data.roomStatus.map((item) => [item.status, item.count])} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <SummaryTable title="Top Rooms" rows={data.topRooms.map((item) => [item.roomName, `${item.bookings} bookings`])} />
              <SummaryTable title="Daily Revenue" rows={data.dailyRevenue.map((item) => [item.date, `${item.revenue.toLocaleString()} kip`])} />
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}

function SummaryTable({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-gray-300 text-[13px]">No data</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <p className="text-[12px] text-gray-600">{label}</p>
              <p className="text-[12px] font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
