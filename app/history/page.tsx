"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link  from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Search, Calendar, Bed, Users, ChevronRight,
  CheckCircle2, Clock, XCircle, AlertCircle,
  CreditCard, Banknote, ArrowLeft, Loader2, X,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────
interface Transaction {
  id:          string
  type:        string
  amount:      number
  method:      string
  status:      string
  paymentDate: string | null
  slipImage:   string | null
}

interface Booking {
  id:             string
  checkIn:        string
  checkOut:       string
  guests:         number
  totalPrice:     number
  status:         string
  specialRequest: string | null
  createdAt:      string
  paymentStatus:  string
  paymentMethod:  string | null
  room: {
    id:      string
    name:    string
    images:  string[]
    view:    string | null
    bedType: string | null
  }
  transactions: Transaction[]
}

// ── Config ───────────────────────────────────────────────────────
const bookingStatusCfg: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:     { label: "ລໍຖ້າ",       color: "bg-amber-100 text-amber-700 border-amber-200",   icon: Clock         },
  CONFIRMED:   { label: "ຢືນຢັນແລ້ວ", color: "bg-blue-100 text-blue-700 border-blue-200",       icon: CheckCircle2  },
  CHECKED_IN:  { label: "Check-in",    color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: CheckCircle2  },
  CHECKED_OUT: { label: "Check-out",   color: "bg-purple-100 text-purple-700 border-purple-200", icon: CheckCircle2  },
  COMPLETED:   { label: "ສຳເລັດ",      color: "bg-green-100 text-green-700 border-green-200",    icon: CheckCircle2  },
  CANCELLED:   { label: "ຍົກເລີກ",    color: "bg-red-100 text-red-700 border-red-200",           icon: XCircle       },
}

const paymentStatusCfg: Record<string, { label: string; color: string }> = {
  PENDING:        { label: "ຍັງບໍ່ຊຳລະ",        color: "text-amber-600" },
  PENDING_VERIFY: { label: "ລໍຖ້າກວດສອບ",       color: "text-blue-600"  },
  PAID:           { label: "ຊຳລະແລ້ວ",          color: "text-green-600" },
  FAILED:         { label: "ຊຳລະບໍ່ສຳເລັດ",    color: "text-red-600"   },
  REFUNDED:       { label: "ຄືນເງິນແລ້ວ",       color: "text-purple-600" },
}

const methodIcon: Record<string, React.ElementType> = {
  TRANSFER:    Banknote,
  CREDIT_CARD: CreditCard,
  CASH:        Banknote,
}

function calcDays(ci: string, co: string) {
  return Math.max(0, Math.floor((new Date(co).getTime() - new Date(ci).getTime()) / 86400000))
}
function fmt(n: number) { return n.toLocaleString() }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) }

// ── Cancel Modal ─────────────────────────────────────────────────
function CancelModal({ booking, onClose, onDone }: {
  booking: Booking
  onClose: () => void
  onDone:  () => void
}) {
  const [reason,  setReason]  = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  async function handleCancel() {
    if (!reason.trim()) { setError("ກະລຸນາລະບຸເຫດຜົນ"); return }
    setLoading(true); setError("")
    try {
      const res  = await fetch("/api/cancel-requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bookingId: booking.id, reason }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? "ບໍ່ສຳເລັດ"); return }
      onDone()
    } catch {
      setError("ເກີດຂໍ້ຜິດພາດ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-lao">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">ຂໍຍົກເລີກການຈອງ</h3>
            <p className="text-[11px] text-gray-400">{booking.room.name} · {fmtDate(booking.checkIn)}</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
          <p className="text-[12px] text-amber-700 flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            Admin ຈະກວດສອບຄຳຮ້ອງ — ການຍົກເລີກຈະມີຜົນຫຼັງໄດ້ຮັບການອະນຸມັດ
          </p>
        </div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">
          ເຫດຜົນການຍົກເລີກ
        </label>
        <textarea
          value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="ລະບຸເຫດຜົນ..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-red-300 resize-none mb-4"
        />
        {error && <p className="text-red-500 text-[12px] mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 transition-all">
            ຍ້ອນກັບ
          </button>
          <button onClick={handleCancel} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            ສົ່ງຄຳຮ້ອງ
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Booking Card ─────────────────────────────────────────────────
function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const bCfg  = bookingStatusCfg[booking.status]  ?? bookingStatusCfg.PENDING
  const pCfg  = paymentStatusCfg[booking.paymentStatus] ?? paymentStatusCfg.PENDING
  const BIcon = bCfg.icon
  const days  = calcDays(booking.checkIn, booking.checkOut)
  const cover = booking.room.images?.[0] && !booking.room.images[0].includes("placeholder")
    ? booking.room.images[0] : "/room.png"
  const MethodIcon = booking.paymentMethod ? (methodIcon[booking.paymentMethod] ?? Banknote) : Banknote
  const canCancel  = ["PENDING", "CONFIRMED"].includes(booking.status)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="flex gap-0">

        {/* Room image */}
        <div className="relative w-28 h-28 flex-shrink-0 sm:w-36 sm:h-36">
          <Image src={cover} alt={booking.room.name} fill className="object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/room.png" }} />
        </div>

        {/* Main info */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-gray-900 truncate">{booking.room.name}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{booking.room.view}</p>
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border flex-shrink-0 ${bCfg.color}`}>
              <BIcon size={10} /> {bCfg.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
            </span>
            <span className="flex items-center gap-1"><Bed   size={11} /> {days} ມື້</span>
            <span className="flex items-center gap-1"><Users size={11} /> {booking.guests} ທ່ານ</span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-[18px] font-black text-blue-600">{fmt(booking.totalPrice)} ₭</p>
              <p className={`text-[10px] font-semibold flex items-center gap-1 ${pCfg.color}`}>
                <MethodIcon size={10} /> {pCfg.label}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Pay button ถ้ายังไม่จ่าย */}
              {booking.paymentStatus === "PENDING" && canCancel && (
                <Link href={`/payment?bookingId=${booking.id}&roomId=${booking.room.id}&checkIn=${booking.checkIn.split("T")[0]}&checkOut=${booking.checkOut.split("T")[0]}`}
                  className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-all">
                  ຊຳລະ
                </Link>
              )}
              {/* Cancel button */}
              {canCancel && (
                <button onClick={onCancel}
                  className="text-[11px] border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition-all">
                  ຍົກເລີກ
                </button>
              )}
              {/* Expand details */}
              <button onClick={() => setExpanded(!expanded)}
                className="text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-all">
                ລາຍລະອຽດ
                <ChevronRight size={12} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-[12px]">
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">Booking ID</p>
              <p className="font-mono text-gray-700 text-[11px]">{booking.id}</p>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">ວັນທີຈອງ</p>
              <p className="text-gray-700">{fmtDate(booking.createdAt)}</p>
            </div>
            {booking.specialRequest && (
              <div className="col-span-2">
                <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">ຄຳຮ້ອງຂໍພິເສດ</p>
                <p className="text-gray-700">{booking.specialRequest}</p>
              </div>
            )}
          </div>

          {/* Transactions */}
          {booking.transactions.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">ປະຫວັດການຊຳລະ</p>
              {booking.transactions.map((tx) => {
                const txPCfg = paymentStatusCfg[tx.status] ?? paymentStatusCfg.PENDING
                const TxIcon = methodIcon[tx.method] ?? Banknote
                return (
                  <div key={tx.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100 mb-1.5">
                    <div className="flex items-center gap-2">
                      <TxIcon size={13} className="text-gray-400" />
                      <div>
                        <p className="text-[11px] font-medium text-gray-800">
                          {tx.type === "CHARGE" ? "ຊຳລະ" : tx.type === "REFUND" ? "ຄືນເງິນ" : "ປັດຕ່ຳ"}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {tx.paymentDate ? fmtDate(tx.paymentDate) : "ຍັງບໍ່ຊຳລະ"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-gray-800">{fmt(tx.amount)} ₭</p>
                      <p className={`text-[10px] font-semibold ${txPCfg.color}`}>{txPCfg.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export default function HistoryPage() {
  const router            = useRouter()
  const { data: session, status } = useSession()

  const [bookings,  setBookings]  = useState<Booking[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState("")
  const [filter,    setFilter]    = useState("ALL")
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)

  // redirect ถ้าไม่ได้ login
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  // fetch bookings
  async function fetchBookings() {
    setLoading(true)
    try {
      const res  = await fetch("/api/bookings")
      const data = await res.json()
      setBookings(data.bookings ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") fetchBookings()
  }, [status])

  // filter + search
  const displayed = bookings.filter((b) => {
    const matchStatus = filter === "ALL" || b.status === filter
    const matchSearch = search === "" ||
      b.room.name.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const filterTabs = [
    { key: "ALL",       label: "ທັງໝົດ"    },
    { key: "PENDING",   label: "ລໍຖ້າ"     },
    { key: "CONFIRMED", label: "ຢືນຢັນ"    },
    { key: "COMPLETED", label: "ສຳເລັດ"    },
    { key: "CANCELLED", label: "ຍົກເລີກ"   },
  ]

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-lao">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 font-lao">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-[16px] font-bold text-gray-900">ປະຫວັດການຈອງ</h1>
            <p className="text-[11px] text-gray-400">
              {session?.user?.name ?? session?.user?.email}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text" placeholder="ຄົ້ນຫາ..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[12px] outline-none bg-gray-50 w-44 focus:border-blue-300 transition-colors"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-6 pb-3 overflow-x-auto">
          {filterTabs.map((t) => {
            const count = t.key === "ALL"
              ? bookings.length
              : bookings.filter((b) => b.status === t.key).length
            return (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  filter === t.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100"
                }`}>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  filter === t.key ? "bg-white/20" : "bg-gray-200 text-gray-600"
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6 max-w-3xl">

        {loading && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Calendar size={28} className="text-gray-300" />
            </div>
            <p className="text-[14px] text-gray-400 font-medium">
              {search || filter !== "ALL" ? "ບໍ່ພົບລາຍການທີ່ຄົ້ນຫາ" : "ຍັງບໍ່ມີປະຫວັດການຈອງ"}
            </p>
            {!search && filter === "ALL" && (
              <Link href="/"
                className="inline-block mt-4 text-[13px] text-blue-600 hover:underline">
                ຈອງຫ້ອງດຽວນີ້ →
              </Link>
            )}
          </div>
        )}

        {!loading && displayed.length > 0 && (
          <div className="flex flex-col gap-4">
            {displayed.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={() => setCancelTarget(booking)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={() => {
            setCancelTarget(null)
            fetchBookings()   // refresh
          }}
        />
      )}
    </main>
  )
}