"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BedDouble, CalendarCheck2, CalendarDays, Star, LogOut,
  LayoutDashboard, X, MoreHorizontal, Loader2,
  RefreshCw, Search, CheckCircle2, XCircle,
  LogIn, LogOut as LogOutIcon, CreditCard, Eye,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────
type BookingStatus = "PENDING"|"CONFIRMED"|"CHECKED_IN"|"CHECKED_OUT"|"COMPLETED"|"CANCELLED"
type PaymentStatus = "PENDING"|"PENDING_VERIFY"|"PAID"|"FAILED"|"REFUNDED"

interface Booking {
  id: string; status: BookingStatus
  checkIn: string; checkOut: string
  guests: number; totalPrice: number
  actualCheckIn: string|null; actualCheckOut: string|null
  user:  { id: string; name: string|null; lastName: string|null; email: string; phone: string|null }
  room:  { id: string; name: string; roomNumber: string|null }
  transactions: { id: string; status: PaymentStatus; amount: number; slipImage: string|null }[]
  approval:      { status: string } | null
  cancelRequest: { status: string; reason: string } | null
}

// ── Config ───────────────────────────────────────────────────────
const ST_CFG: Record<BookingStatus, { label: string; color: string; dot: string }> = {
  PENDING:     { label: "ລໍຖ້າ",      color: "bg-yellow-100 text-yellow-700",  dot: "bg-yellow-400"  },
  CONFIRMED:   { label: "ຢືນຢັນ",     color: "bg-blue-100   text-blue-700",    dot: "bg-blue-500"    },
  CHECKED_IN:  { label: "Check-in",   color: "bg-purple-100 text-purple-700",  dot: "bg-purple-500"  },
  CHECKED_OUT: { label: "Check-out",  color: "bg-indigo-100 text-indigo-700",  dot: "bg-indigo-500"  },
  COMPLETED:   { label: "ສຳເລັດ",     color: "bg-green-100  text-green-700",   dot: "bg-green-500"   },
  CANCELLED:   { label: "ຍົກເລີກ",    color: "bg-red-100    text-red-600",     dot: "bg-red-400"     },
}
const PAY_CFG: Record<PaymentStatus, { label: string; color: string }> = {
  PENDING:        { label: "ຍັງບໍ່ຊຳລະ",    color: "text-gray-400"   },
  PENDING_VERIFY: { label: "ລໍຕຮວດ slip",  color: "text-orange-500" },
  PAID:           { label: "ຊຳລະແລ້ວ",     color: "text-green-600"  },
  FAILED:         { label: "ຊຳລະຜິດ",      color: "text-red-500"    },
  REFUNDED:       { label: "ຄືນເງິນແລ້ວ",  color: "text-blue-500"   },
}
const TRANSITIONS: Record<BookingStatus, { status: BookingStatus; label: string; color: string; icon: React.ElementType }[]> = {
  PENDING:     [{ status:"CONFIRMED",  label:"ຢືນຢັນ",   color:"text-blue-600",   icon:CheckCircle2 },
                { status:"CANCELLED",  label:"ຍົກເລີກ",  color:"text-red-500",    icon:XCircle      }],
  CONFIRMED:   [{ status:"CHECKED_IN", label:"Check-in", color:"text-purple-600", icon:LogIn        },
                { status:"CANCELLED",  label:"ຍົກເລີກ",  color:"text-red-500",    icon:XCircle      }],
  CHECKED_IN:  [{ status:"CHECKED_OUT",label:"Check-out",color:"text-indigo-600", icon:LogOutIcon   }],
  CHECKED_OUT: [{ status:"COMPLETED",  label:"ສຳເລັດ",   color:"text-green-600",  icon:CheckCircle2 }],
  COMPLETED:   [],
  CANCELLED:   [],
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
            { icon: LayoutDashboard, label: "Dashboard",       path: "/admin/dashboard" },
            { icon: BedDouble,       label: "ຈັດການຫ້ອງ",     path: "/booking"         },
            { icon: CalendarCheck2,  label: "ຈັດການພະນັກງານ", path: "/staff"           },
            { icon: CalendarDays,    label: "ຈັດການການຈອງ",   path: "/schedule"        },
            { icon: Star,            label: "ຈັດການລີວິວ",    path: "/review"          },
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

// ── Detail Modal ─────────────────────────────────────────────────
function BookingDetail({ booking, onClose, onUpdated }: { booking: Booking; onClose: () => void; onUpdated: () => void }) {
  const [saving,    setSaving]    = useState<string|null>(null)
  const [verifying, setVerifying] = useState(false)
  const [remarks,   setRemarks]   = useState("")
  const [error,     setError]     = useState("")

  async function changeStatus(status: BookingStatus) {
    setSaving(status); setError("")
    const body: Record<string, unknown> = { status }
    if (status === "CHECKED_IN")  body.actualCheckIn  = new Date().toISOString()
    if (status === "CHECKED_OUT") body.actualCheckOut = new Date().toISOString()
    if (remarks) {
      if (status === "CHECKED_IN")  body.checkInRemarks  = remarks
      if (status === "CHECKED_OUT") body.checkOutRemarks = remarks
    }
    const res  = await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "ບໍ່ສຳເລັດ"); setSaving(null); return }
    onUpdated(); onClose()
  }

  async function verifyPayment(txId: string, status: "PAID"|"FAILED") {
    setVerifying(true); setError("")
    const res  = await fetch(`/api/admin/payments/${txId}/verify`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "ບໍ່ສຳເລັດ"); setVerifying(false); return }
    onUpdated(); onClose()
  }

  const tx        = booking.transactions[0]
  const stCfg     = ST_CFG[booking.status]
  const userName  = [booking.user.name, booking.user.lastName].filter(Boolean).join(" ") || booking.user.email
  const checkInFmt  = new Date(booking.checkIn).toLocaleDateString("lo-LA",  { day: "2-digit", month: "short", year: "numeric" })
  const checkOutFmt = new Date(booking.checkOut).toLocaleDateString("lo-LA", { day: "2-digit", month: "short", year: "numeric" })
  const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-300 hover:text-gray-600"><X size={18} /></button>

        <div className="flex items-center gap-3 mb-5">
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${stCfg.color}`}>{stCfg.label}</span>
          <p className="text-[11px] text-gray-400 font-mono">{booking.id.slice(-8).toUpperCase()}</p>
        </div>

        {/* User + Room */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">ຜູ້ຈອງ</p>
            <p className="text-[13px] font-semibold text-gray-800">{userName}</p>
            <p className="text-[11px] text-gray-400">{booking.user.email}</p>
            {booking.user.phone && <p className="text-[11px] text-gray-400">{booking.user.phone}</p>}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">ຫ້ອງ</p>
            <p className="text-[13px] font-semibold text-gray-800">{booking.room.name}</p>
            <p className="text-[11px] text-gray-400">ຫ້ອງ {booking.room.roomNumber ?? "—"}</p>
            <p className="text-[11px] text-gray-400">{booking.guests} ທ່ານ</p>
          </div>
        </div>

        {/* Dates + Price */}
        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <div className="flex justify-between text-[12px]">
            <div>
              <p className="text-gray-400 text-[10px]">Check-in</p>
              <p className="font-semibold text-gray-800">{checkInFmt}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-[10px]">ຈຳນວນຄືນ</p>
              <p className="font-bold text-blue-700">{nights} ຄືນ</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-[10px]">Check-out</p>
              <p className="font-semibold text-gray-800">{checkOutFmt}</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-100 flex justify-between">
            <p className="text-[11px] text-gray-500">ລາຄາລວມ</p>
            <p className="text-[13px] font-bold text-blue-700">{Number(booking.totalPrice).toLocaleString()} ₭</p>
          </div>
        </div>

        {/* Payment */}
        {tx && (
          <div className="border border-gray-100 rounded-xl p-3 mb-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard size={11} /> ການຊຳລະເງິນ
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-[12px] font-semibold ${PAY_CFG[tx.status].color}`}>
                {PAY_CFG[tx.status].label}
              </span>
              <span className="text-[12px] font-mono text-gray-700">{Number(tx.amount).toLocaleString()} ₭</span>
            </div>
            {tx.slipImage && (
              <a href={tx.slipImage} target="_blank" rel="noreferrer"
                className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-500 hover:underline">
                <Eye size={11} /> ເບິ່ງ slip
              </a>
            )}
            {tx.status === "PENDING_VERIFY" && (
              <div className="flex gap-2 mt-3">
                <button disabled={verifying} onClick={() => verifyPayment(tx.id, "PAID")}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[11px] font-bold disabled:opacity-50">
                  ✅ ຢືນຢັນຊຳລະ
                </button>
                <button disabled={verifying} onClick={() => verifyPayment(tx.id, "FAILED")}
                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-bold disabled:opacity-50">
                  ❌ ປະຕິເສດ
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cancel Request */}
        {booking.cancelRequest && (
          <div className="bg-red-50 rounded-xl p-3 mb-4 text-[12px]">
            <p className="font-semibold text-red-700 mb-1">📋 ຂໍຍົກເລີກ ({booking.cancelRequest.status})</p>
            <p className="text-gray-600">{booking.cancelRequest.reason}</p>
          </div>
        )}

        {/* Remarks input (for check-in/out) */}
        {(booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && (
          <div className="mb-3">
            <label className="text-[11px] text-gray-500 font-semibold">ໝາຍເຫດ (ທາງເລືອກ)</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)}
              placeholder="ໝາຍເຫດ check-in/out..."
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 bg-white outline-none focus:border-blue-300" />
          </div>
        )}

        {error && <p className="text-red-500 text-[12px] mb-3">{error}</p>}

        {/* Action buttons */}
        {TRANSITIONS[booking.status].length > 0 && (
          <div className="flex gap-2">
            {TRANSITIONS[booking.status].map(({ status, label, color, icon: Icon }) => (
              <button key={status} disabled={!!saving}
                onClick={() => changeStatus(status)}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border-2 flex items-center justify-center gap-1.5
                  ${status === "CANCELLED"
                    ? "border-red-200 text-red-500 hover:bg-red-50"
                    : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"}
                  disabled:opacity-50 transition-all`}>
                <Icon size={13} />
                {saving === status ? "ກຳລັງດຳເນີນການ..." : label}
              </button>
            ))}
          </div>
        )}

        {TRANSITIONS[booking.status].length === 0 && (
          <p className="text-center text-[12px] text-gray-400 py-2">ການຈອງນີ້ສິ້ນສຸດແລ້ວ</p>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export default function SchedulePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [bookings,  setBookings]  = useState<Booking[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState("")
  const [filterSt,  setFilterSt]  = useState<BookingStatus|"ALL">("ALL")
  const [selected,  setSelected]  = useState<Booking|null>(null)
  const [openDrop,  setOpenDrop]  = useState<string|null>(null)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role === "USER") router.push("/profile")
  }, [status, session, router])

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const q   = filterSt !== "ALL" ? `?status=${filterSt}` : ""
      const res = await fetch(`/api/admin/bookings${q}`)
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } catch { setBookings([]) }
    finally  { setLoading(false) }
  }, [filterSt])

  useEffect(() => { if (status === "authenticated") fetchBookings() }, [status, fetchBookings])

  const filtered = bookings.filter((b) => {
    if (!search) return true
    const full = `${b.user.name ?? ""} ${b.user.lastName ?? ""} ${b.user.email} ${b.room.name}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  const counts = {
    ALL:         bookings.length,
    PENDING:     bookings.filter((b) => b.status === "PENDING").length,
    CONFIRMED:   bookings.filter((b) => b.status === "CONFIRMED").length,
    CHECKED_IN:  bookings.filter((b) => b.status === "CHECKED_IN").length,
    COMPLETED:   bookings.filter((b) => b.status === "COMPLETED").length,
    CANCELLED:   bookings.filter((b) => b.status === "CANCELLED").length,
  }

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={28} className="text-blue-500 animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <Sidebar active="/schedule" />

      <main className="ml-[210px] flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
          <h1 className="text-[14px] font-bold text-gray-900">ຈັດການການຈອງ</h1>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400">{session?.user?.name}</span>
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
              {session?.user?.name?.[0] ?? "A"}
            </div>
          </div>
        </header>

        <div className="flex-1 p-8">
          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {(["ALL","PENDING","CONFIRMED","CHECKED_IN","COMPLETED","CANCELLED"] as const).map((s) => (
              <button key={s} onClick={() => setFilterSt(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5
                  ${filterSt === s ? "bg-[#1E1040] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {s !== "ALL" && <span className={`w-1.5 h-1.5 rounded-full ${ST_CFG[s].dot}`} />}
                {s === "ALL" ? "ທັງໝົດ" : ST_CFG[s].label}
                <span className="opacity-60">({counts[s as keyof typeof counts] ?? bookings.length})</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="ຄົ້ນຫາ..."
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 bg-white outline-none focus:border-blue-300 w-44" />
              </div>
              <button onClick={fetchBookings} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-[1fr_140px_120px_120px_70px_120px_80px] gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              {["ຜູ້ຈອງ","ຫ້ອງ","Check-in","Check-out","ຄົນ","ສະຖານະ",""].map((h, i) => (
                <p key={i} className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</p>
              ))}
            </div>

            {loading ? (
              <div className="py-16 flex justify-center"><Loader2 size={24} className="text-blue-400 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-300 text-[13px]">ບໍ່ມີຂໍ້ມູນ</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((b) => {
                  const st       = ST_CFG[b.status]
                  const tx       = b.transactions[0]
                  const userName = [b.user.name, b.user.lastName].filter(Boolean).join(" ") || b.user.email
                  const cin      = new Date(b.checkIn).toLocaleDateString("lo-LA",  { day: "2-digit", month: "short" })
                  const cout     = new Date(b.checkOut).toLocaleDateString("lo-LA", { day: "2-digit", month: "short" })
                  return (
                    <div key={b.id}
                      className="grid grid-cols-[1fr_140px_120px_120px_70px_120px_80px] gap-2 items-center px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <div>
                        <p className="text-[13px] font-medium text-gray-800 truncate">{userName}</p>
                        <p className="text-[10px] text-gray-400 truncate">{b.user.email}</p>
                        {tx && (
                          <p className={`text-[10px] font-semibold mt-0.5 ${PAY_CFG[tx.status].color}`}>
                            {PAY_CFG[tx.status].label}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-gray-700">{b.room.name}</p>
                        <p className="text-[10px] text-gray-400">ຫ້ອງ {b.room.roomNumber ?? "—"}</p>
                      </div>
                      <p className="text-[12px] text-gray-600">{cin}</p>
                      <p className="text-[12px] text-gray-600">{cout}</p>
                      <p className="text-[12px] text-gray-500">{b.guests}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="relative flex justify-end">
                        <button onClick={() => setOpenDrop(openDrop === b.id ? null : b.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <MoreHorizontal size={16} />
                        </button>
                        {openDrop === b.id && (
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                            <button onClick={() => { setSelected(b); setOpenDrop(null) }}
                              className="w-full text-left px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium">
                              📋 ລາຍລະອຽດ
                            </button>
                            {TRANSITIONS[b.status].map(({ status: ns, label, color }) => (
                              <button key={ns}
                                onClick={async () => {
                                  setOpenDrop(null)
                                  await fetch(`/api/admin/bookings/${b.id}`, {
                                    method: "PATCH", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      status: ns,
                                      ...(ns === "CHECKED_IN"  ? { actualCheckIn:  new Date().toISOString() } : {}),
                                      ...(ns === "CHECKED_OUT" ? { actualCheckOut: new Date().toISOString() } : {}),
                                    }),
                                  })
                                  fetchBookings()
                                }}
                                className={`w-full text-left px-4 py-2 text-[12px] hover:bg-gray-50 font-medium ${color}`}>
                                {label}
                              </button>
                            ))}
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

      {selected && (
        <BookingDetail booking={selected} onClose={() => setSelected(null)} onUpdated={fetchBookings} />
      )}
      {openDrop && <div className="fixed inset-0 z-40" onClick={() => setOpenDrop(null)} />}
    </div>
  )
}