"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard, CalendarDays, Users, BookOpen,
  Star, LogOut, BedDouble, CheckCircle2, Clock,
  XCircle, TrendingUp, CreditCard, AlertCircle,
  ArrowUpRight, ArrowDownRight, Loader2,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────
interface Stats {
  rooms:    { total: number; available: number; occupied: number; maintenance: number }
  bookings: { total: number; pending: number; confirmed: number; checkedIn: number; completed: number; cancelled: number; todayCheckIns: number; todayCheckOuts: number }
  payments: { pendingVerify: number; monthRevenue: number; totalRevenue: number }
  misc:     { pendingReviews: number; totalStaff: number; totalUsers: number }
  recentBookings: {
    id: string; status: string; totalPrice: number; checkIn: string; checkOut: string; createdAt: string
    user: { name: string | null; lastName: string | null; email: string }
    room: { name: string }
    transactions: { status: string }[]
  }[]
}

// ── Status helpers ───────────────────────────────────────────────
const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:     { label: "ລໍຖ້າ",       color: "bg-yellow-100 text-yellow-700" },
  CONFIRMED:   { label: "ຢືນຢັນ",      color: "bg-blue-100   text-blue-700"   },
  CHECKED_IN:  { label: "Check-in",    color: "bg-purple-100 text-purple-700" },
  CHECKED_OUT: { label: "Check-out",   color: "bg-indigo-100 text-indigo-700" },
  COMPLETED:   { label: "ສຳເລັດ",      color: "bg-green-100  text-green-700"  },
  CANCELLED:   { label: "ຍົກເລີກ",     color: "bg-red-100    text-red-600"    },
}

// ── Sidebar ──────────────────────────────────────────────────────
function Sidebar({ active, role }: { active: string; role?: string }) {
  const nav = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ...(role === "SUPERADMIN"
      ? [
          { href: "/booking", icon: CalendarDays, label: "ຫ້ອງພັກ" },
          { href: "/staff",   icon: Users,        label: "ພະນັກງານ" },
        ]
      : []),
    { href: "/admin/room-status", icon: BedDouble, label: "Room Status" },
    { href: "/schedule",        icon: BookOpen,        label: "ຕາຕະລາງ" },
    { href: "/review",          icon: Star,            label: "ລີວິວ"    },
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
          <LogOut size={13} /> ອອກຈາກລະບົບ
        </button>
      </div>
    </aside>
  )
}

// ── Stat Card ────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color, href, alert,
}: {
  icon: React.ElementType; label: string; value: string | number
  sub?: string; color: string; href?: string; alert?: boolean
}) {
  const inner = (
    <div className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all
      ${alert ? "border-orange-200" : "border-gray-100"}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {alert && <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
        {href && !alert && <ArrowUpRight size={14} className="text-gray-300" />}
      </div>
      <p className="text-[24px] font-bold text-gray-900 mt-3 leading-none">{value}</p>
      <p className="text-[12px] font-medium text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

// ── Main ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status !== "authenticated")   return
    if (session?.user?.role === "USER") { router.push("/profile"); return }

    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [status, session, router])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!stats) return null
  const { rooms, bookings, payments, misc, recentBookings } = stats

  const occupancyPct = rooms.total > 0
    ? Math.round((rooms.occupied / rooms.total) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 flex font-lao">
      <Sidebar active="/admin/dashboard" role={session?.user?.role} />

      <main className="flex-1 ml-56 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">
              ສະບາຍດີ, {session?.user?.name ?? session?.user?.email} · {new Date().toLocaleDateString("lo-LA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {(payments.pendingVerify > 0 || bookings.pending > 0 || misc.pendingReviews > 0) && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-[12px]">
              <AlertCircle size={13} />
              ມີລາຍການລໍຖ້າ {payments.pendingVerify + bookings.pending + misc.pendingReviews} ລາຍການ
            </div>
          )}
        </div>

        {/* Row 1 — Room stats */}
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">ສະຖານະຫ້ອງ</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={BedDouble}    label="ຫ້ອງທັງໝົດ"  value={rooms.total}       sub={`Occupancy ${occupancyPct}%`} color="bg-slate-500"  href="/booking" />
          <StatCard icon={CheckCircle2} label="ຫ້ອງວ່າງ"    value={rooms.available}   color="bg-green-500"  href="/booking" />
          <StatCard icon={Users}        label="ມີຜູ້ພັກ"    value={rooms.occupied}    color="bg-blue-500"   href="/booking" />
          <StatCard icon={AlertCircle}  label="ສ້ອມແປງ"     value={rooms.maintenance} color="bg-orange-400" href="/booking" />
        </div>

        {/* Row 2 — Booking stats */}
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">ການຈອງ</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Clock}        label="ລໍຢືນຢັນ"    value={bookings.pending}   color="bg-yellow-500" alert={bookings.pending > 0}   href="/schedule" />
          <StatCard icon={CalendarDays} label="Check-in ວັນນີ້"  value={bookings.todayCheckIns}  color="bg-purple-500" href="/schedule" />
          <StatCard icon={ArrowDownRight} label="Check-out ວັນນີ້" value={bookings.todayCheckOuts} color="bg-indigo-500" href="/schedule" />
          <StatCard icon={XCircle}      label="ຍົກເລີກ"     value={bookings.cancelled} color="bg-red-400"    href="/schedule" />
        </div>

        {/* Row 3 — Revenue + misc */}
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">ການເງິນ & ອື່ນໆ</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={TrendingUp}   label="ລາຍໄດ້ເດືອນນີ້"
            value={`${payments.monthRevenue.toLocaleString()} ₭`}
            color="bg-emerald-500" />
          <StatCard icon={CreditCard}   label="ລໍຢືນຢັນຊຳລະ"
            value={payments.pendingVerify}
            color="bg-pink-500" alert={payments.pendingVerify > 0} href="/schedule" />
          <StatCard icon={Star}         label="ລີວິວລໍກວດ"
            value={misc.pendingReviews}
            color="bg-cyan-500" alert={misc.pendingReviews > 0} href="/review" />
          <StatCard icon={Users}        label="ຜູ້ໃຊ້ລະບົບ"
            value={misc.totalUsers}
            sub={`Staff ${misc.totalStaff} ຄົນ`} color="bg-slate-400" />
        </div>

        {/* Occupancy bar */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[13px] font-semibold text-gray-800">Occupancy Rate</p>
            <p className="text-[13px] font-bold text-blue-600">{occupancyPct}%</p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
              style={{ width: `${occupancyPct}%` }} />
          </div>
          <div className="flex gap-5 mt-3">
            {[
              { label: "ວ່າງ",     value: rooms.available,    color: "bg-green-400"  },
              { label: "ມີຜູ້ພັກ", value: rooms.occupied,     color: "bg-blue-400"   },
              { label: "ສ້ອມແປງ",  value: rooms.maintenance,  color: "bg-orange-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                {label}: {value}
              </div>
            ))}
          </div>
        </div>

        {/* Booking summary row */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { label: "PENDING",     val: bookings.pending,   bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
            { label: "CONFIRMED",   val: bookings.confirmed, bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"   },
            { label: "CHECK-IN",    val: bookings.checkedIn, bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
            { label: "COMPLETED",   val: bookings.completed, bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200"  },
            { label: "CANCELLED",   val: bookings.cancelled, bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200"    },
          ].map(({ label, val, bg, text, border }) => (
            <div key={label} className={`${bg} ${border} border rounded-xl p-4 text-center`}>
              <p className={`text-[22px] font-bold ${text}`}>{val}</p>
              <p className={`text-[10px] font-semibold ${text} mt-0.5 uppercase tracking-wide`}>{label}</p>
            </div>
          ))}
        </div>

        {/* Recent bookings table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-[13px] font-semibold text-gray-800">ການຈອງລ່າສຸດ</p>
            <Link href="/schedule" className="text-[11px] text-blue-500 hover:underline flex items-center gap-1">
              ເບິ່ງທັງໝົດ <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">ຜູ້ຈອງ</th>
                  <th className="px-4 py-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">ຫ້ອງ</th>
                  <th className="px-4 py-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">ວັນທີ</th>
                  <th className="px-4 py-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">ລາຄາ</th>
                  <th className="px-4 py-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">ສະຖານະ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentBookings.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">ຍັງບໍ່ມີການຈອງ</td></tr>
                ) : recentBookings.map((b) => {
                  const st  = BOOKING_STATUS[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600" }
                  const cin = new Date(b.checkIn).toLocaleDateString("lo-LA",  { day: "2-digit", month: "short" })
                  const cout= new Date(b.checkOut).toLocaleDateString("lo-LA", { day: "2-digit", month: "short" })
                  const name= [b.user.name, b.user.lastName].filter(Boolean).join(" ") || b.user.email
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800 truncate max-w-[120px]">{name}</p>
                        <p className="text-gray-400 text-[10px]">{b.user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{b.room.name}</td>
                      <td className="px-4 py-3 text-gray-500">{cin} – {cout}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{Number(b.totalPrice).toLocaleString()} ₭</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
