"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  CheckCircle2, Clock, XCircle, Printer, ArrowLeft,
  Bed, Users, Calendar, CreditCard, Loader2, MapPin,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────
interface Transaction {
  id:          string
  type:        string
  amount:      number
  method:      string
  status:      string
  paymentDate: string | null
}

interface BookingDetail {
  id:             string
  checkIn:        string
  checkOut:       string
  guests:         number
  totalPrice:     number
  status:         string
  specialRequest: string | null
  createdAt:      string
  user:  { id: string; name: string | null; lastName: string | null; email: string; phone: string | null }
  room:  { id: string; name: string; roomNumber: string | null; view: string | null; bedType: string | null }
  transactions: Transaction[]
}

const statusCfg: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:     { label: "ລໍຖ້າຊຳລະ",  color: "bg-amber-100 text-amber-700",   icon: Clock        },
  CONFIRMED:   { label: "ຢືນຢັນແລ້ວ", color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  CHECKED_IN:  { label: "Check-in",    color: "bg-indigo-100 text-indigo-700", icon: CheckCircle2 },
  CHECKED_OUT: { label: "Check-out",   color: "bg-purple-100 text-purple-700", icon: CheckCircle2 },
  COMPLETED:   { label: "ສຳເລັດ",      color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  CANCELLED:   { label: "ຍົກເລີກ",    color: "bg-red-100 text-red-700",        icon: XCircle      },
}

const paymentStatusLabel: Record<string, string> = {
  PENDING:        "ຍັງບໍ່ຊຳລະ",
  PENDING_VERIFY: "ລໍຖ້າກວດສອບ",
  PAID:           "ຊຳລະແລ້ວ",
  FAILED:         "ຊຳລະບໍ່ສຳເລັດ",
  REFUNDED:       "ຄືນເງິນແລ້ວ",
}

function calcDays(ci: string, co: string) {
  return Math.max(0, Math.floor((new Date(co).getTime() - new Date(ci).getTime()) / 86400000))
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default function VoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { status: sessionStatus } = useSession()

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  useEffect(() => {
    if (sessionStatus === "unauthenticated") { router.push("/login"); return }
    if (sessionStatus !== "authenticated") return
    fetch(`/api/bookings/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error(d.error ?? "ບໍ່ພົບໃບຈອງ")
        }
        return r.json()
      })
      .then(setBooking)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, sessionStatus, router])

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-lao">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-lao gap-4">
        <p className="text-gray-500 text-[14px]">{error || "ບໍ່ພົບໃບຈອງ"}</p>
        <Link href="/history" className="text-blue-600 text-[13px] hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> ກັບໄປປະຫວັດການຈອງ
        </Link>
      </div>
    )
  }

  const cfg   = statusCfg[booking.status] ?? statusCfg.PENDING
  const SIcon = cfg.icon
  const days  = calcDays(booking.checkIn, booking.checkOut)
  const latestTx = booking.transactions[0]
  const guestName = [booking.user.name, booking.user.lastName].filter(Boolean).join(" ") || booking.user.email
  const isConfirmed = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"].includes(booking.status)

  return (
    <main className="min-h-screen bg-gray-100 font-lao py-8 px-4 print:bg-white print:py-0">
      {/* Toolbar — hidden when printing */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <button onClick={() => router.push("/history")}
          className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={15} /> ກັບຄືນ
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95">
          <Printer size={15} /> ພິມ / ບັນທຶກ PDF
        </button>
      </div>

      {/* Voucher card */}
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none border border-gray-200 print:border-0">

        {/* Header */}
        <div className="bg-[#071A33] text-white px-8 py-6 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 mb-1">ໃບຢືນຢັນການຈອງ / Booking Voucher</p>
            <h1 className="text-[22px] font-extrabold tracking-wide">Resort MDNK1</h1>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${cfg.color}`}>
            <SIcon size={12} /> {cfg.label}
          </span>
        </div>

        {/* Booking code */}
        <div className="px-8 py-5 border-b border-dashed border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">ລະຫັດການຈອງ / Booking ID</p>
            <p className="font-mono text-[15px] font-bold text-gray-900">{booking.id}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">ວັນທີຈອງ / Booked</p>
            <p className="text-[13px] text-gray-700">{fmtDate(booking.createdAt)}</p>
          </div>
        </div>

        {/* Guest + Room */}
        <div className="px-8 py-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">ຜູ້ເຂົ້າພັກ / Guest</p>
            <p className="text-[14px] font-semibold text-gray-900">{guestName}</p>
            <p className="text-[12px] text-gray-500 mt-0.5">{booking.user.email}</p>
            {booking.user.phone && <p className="text-[12px] text-gray-500">{booking.user.phone}</p>}
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">ຫ້ອງພັກ / Room</p>
            <p className="text-[14px] font-semibold text-gray-900 flex items-center gap-1.5">
              <Bed size={13} className="text-gray-500" /> {booking.room.name}
            </p>
            {booking.room.roomNumber && (
              <p className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                <MapPin size={12} className="text-gray-500" /> ຫ້ອງເລກທີ {booking.room.roomNumber}
              </p>
            )}
            {booking.room.view && <p className="text-[12px] text-gray-500">{booking.room.view}</p>}
            <p className="text-[12px] text-gray-500 mt-1 flex items-center gap-1.5">
              <Users size={12} className="text-gray-500" /> {booking.guests} ທ່ານ · {booking.room.bedType ?? "-"}
            </p>
          </div>
        </div>

        {/* Stay dates */}
        <div className="px-8 pb-6 grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Calendar size={9} /> Check-in
            </p>
            <p className="text-[13px] font-bold text-gray-800">{fmtDate(booking.checkIn)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100 flex flex-col justify-center">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">ຄືນ / Nights</p>
            <p className="text-[16px] font-black text-blue-600">{days}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Calendar size={9} /> Check-out
            </p>
            <p className="text-[13px] font-bold text-gray-800">{fmtDate(booking.checkOut)}</p>
          </div>
        </div>

        {/* Payment */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <CreditCard size={11} /> ການຊຳລະ / Payment
            </p>
            <p className="text-[13px] font-semibold text-gray-700">
              {latestTx ? (paymentStatusLabel[latestTx.status] ?? latestTx.status) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">ລວມທັງໝົດ / Total</p>
            <p className="text-[22px] font-black text-blue-600">{booking.totalPrice.toLocaleString()} ₭</p>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-8 py-5 text-center border-t border-dashed border-gray-200">
          {isConfirmed ? (
            <p className="text-[12px] text-gray-500">
              ກະລຸນານຳໃບຢືນຢັນນີ້ (ພ້ອມບັດປະຊາຊົນ/ພາສປອດ) ໄປສະແດງທີ່ Front Desk ຕອນ Check-in
              <br />
              <span className="text-gray-500">Please present this voucher with your ID/passport at check-in.</span>
            </p>
          ) : booking.status === "CANCELLED" ? (
            <p className="text-[12px] text-red-500">ການຈອງນີ້ຖືກຍົກເລີກແລ້ວ — ໃບຢືນຢັນນີ້ບໍ່ສາມາດໃຊ້ໄດ້</p>
          ) : (
            <p className="text-[12px] text-amber-600">
              ⏳ ການຈອງຍັງບໍ່ຖືກຢືນຢັນ — ໃບຢືນຢັນສົມບູນຈະໃຊ້ໄດ້ຫຼັງ Admin ກວດສອບການຊຳລະ
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
