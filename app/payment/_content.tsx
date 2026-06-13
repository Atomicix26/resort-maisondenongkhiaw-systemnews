"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  CheckCircle2, Upload, X, ArrowLeft,
  Bed, Users, Calendar, Banknote, Hotel,
  Loader2, ChevronDown, Globe, AlertCircle,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────
interface Room {
  id:        string
  name:      string
  price:     number    // ราคาใน LAK
  capacity:  number
  bedType:   string
  view:      string | null
  images:    string[]
}

type Step      = "confirm" | "pay" | "success"
type PayMethod = "transfer" | "pay_at_hotel"
type Currency  = "LAK" | "USD" | "THB"

// ── Exchange rates (approximate — สำหรับ display เท่านั้น)
// Production: ควรดึงจาก API เช่น exchangerate-api.com
const RATES: Record<Currency, number> = {
  LAK: 1,
  USD: 1 / 21500,  // 1 USD ≈ 21,500 LAK
  THB: 1 / 590,    // 1 THB ≈ 590 LAK
}

const CURRENCY_SYMBOL: Record<Currency, string> = {
  LAK: "₭",
  USD: "$",
  THB: "฿",
}

function convertPrice(lakAmount: number, currency: Currency): string {
  const converted = lakAmount * RATES[currency]
  if (currency === "LAK") return converted.toLocaleString()
  return converted.toFixed(2)
}

function calcDays(ci: string, co: string) {
  if (!ci || !co) return 0
  return Math.max(0, Math.floor(
    (new Date(co).getTime() - new Date(ci).getTime()) / 86400000
  ))
}
function getRoomCover(room: Room) {
  if (room.images?.[0] && !room.images[0].includes("placeholder")) return room.images[0]
  return "/room.png"
}

// ── PriceDisplay ─────────────────────────────────────────────────
function PriceDisplay({ lak, currency }: { lak: number; currency: Currency }) {
  const sym = CURRENCY_SYMBOL[currency]
  const val = convertPrice(lak, currency)
  return (
    <span>
      {currency !== "LAK" && <span className="text-[11px] font-normal text-gray-400 mr-0.5">{sym}</span>}
      {val}
      {currency === "LAK" && <span className="text-[11px] font-normal text-gray-400 ml-0.5">{sym}</span>}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
export default function PaymentContent() {
  const router  = useRouter()
  const params  = useSearchParams()
  const { status } = useSession()

  const roomId   = params.get("roomId")   ?? ""
  const checkIn  = params.get("checkIn")  ?? ""
  const checkOut = params.get("checkOut") ?? ""

  const [room,        setRoom]        = useState<Room | null>(null)
  const [loadRoom,    setLoadRoom]    = useState(true)
  const [step,        setStep]        = useState<Step>("confirm")
  const [guests,      setGuests]      = useState(1)
  const [special,     setSpecial]     = useState("")
  const [bookingId,   setBookingId]   = useState("")
  const [method,      setMethod]      = useState<PayMethod>("transfer")
  const [currency,    setCurrency]    = useState<Currency>("LAK")
  const [slipFile,    setSlipFile]    = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState("")
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  // ✅ ดึงแค่ห้องเดียว ไม่ดึงทั้งหมด
  useEffect(() => {
    if (!roomId) return
    const q = new URLSearchParams({ checkIn, checkOut })
    fetch(`/api/rooms/${roomId}?${q.toString()}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setRoom(data ?? null))
      .catch(() => setRoom(null))
      .finally(() => setLoadRoom(false))
  }, [roomId, checkIn, checkOut])

  // ✅ revoke ObjectURL — ป้องกัน memory leak
  useEffect(() => {
    if (!slipPreview) return
    return () => URL.revokeObjectURL(slipPreview)
  }, [slipPreview])

  const days  = calcDays(checkIn, checkOut)
  const total = room ? days * room.price : 0

  // ── Step 1: ยืนยันการจอง ─────────────────────────────────────
  async function handleConfirm() {
    if (!room || days <= 0) { setError("ວັນທີບໍ່ຖືກຕ້ອງ"); return }
    setError(""); setLoading(true)
    try {
      const res = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId, checkIn, checkOut,
          guests:         guests.toString(),
          specialRequest: special,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? "ຈອງບໍ່ສຳເລັດ"); return }
      setBookingId(data.booking.id)
      setStep("pay")
    } catch {
      setError("ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່")
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: ชำระเงิน ─────────────────────────────────────────
  async function handlePay() {
    setError(""); setLoading(true)
    try {
      const fd = new FormData()
      fd.append("bookingId", bookingId)
      fd.append("method", method)
      if (method === "transfer") {
        if (!slipFile) { setError("ກະລຸນາອັບໂຫຼດສລິບ"); setLoading(false); return }
        fd.append("slipFile", slipFile)
      }

      const res  = await fetch("/api/payments", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? "ບໍ່ສຳເລັດ"); return }
      setStep("success")
    } catch {
      setError("ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່")
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSlipFile(file)
    setSlipPreview(URL.createObjectURL(file))
  }

  // ─────────────────────────────────────────────────────────────
  if (status === "loading" || loadRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-lao">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-lao gap-4">
        <p className="text-gray-500 text-[14px]">ບໍ່ພົບຂໍ້ມູນຫ້ອງ / Room not found</p>
        <button onClick={() => router.push("/")}
          className="text-blue-600 text-[13px] hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> ກັບຄືນ / Back
        </button>
      </div>
    )
  }

  // ── SUCCESS ──────────────────────────────────────────────────
  if (step === "success") {
    const isHotelPay = method === "pay_at_hotel"
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-lao px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${isHotelPay ? "bg-amber-100" : "bg-green-100"}`}>
            {isHotelPay
              ? <Hotel size={32} className="text-amber-500" />
              : <CheckCircle2 size={32} className="text-green-500" />}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {isHotelPay ? "ການຈອງຢືນຢັນແລ້ວ!" : "ອັບໂຫຼດສລິບສຳເລັດ!"}
          </h2>
          <p className="text-[13px] font-medium text-gray-400 mb-4">
            {isHotelPay ? "Booking Confirmed!" : "Slip Uploaded!"}
          </p>

          {isHotelPay && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
              <p className="text-[12px] font-semibold text-amber-800 mb-1">
                📍 ກະລຸນາຊຳລະເງິນທີ່ Hotel
              </p>
              <p className="text-[11px] text-amber-700">
                Please pay at the hotel upon check-in.<br/>
                ชำระเงินที่โรงแรมในวันเข้าพัก
              </p>
            </div>
          )}

          {!isHotelPay && (
            <p className="text-[12px] text-gray-500 mb-4">
              Admin will verify your payment slip shortly.<br/>
              <span className="text-lao">ກຳລັງລໍຖ້າ Admin ກວດສອບ</span>
            </p>
          )}

          <div className="bg-gray-50 rounded-xl p-4 mb-5 text-left space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-gray-400">Booking ID</span><span className="font-mono text-[10px]">{bookingId}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">ຫ້ອງ / Room</span><span className="font-medium">{room.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Check-in</span><span className="font-medium">{checkIn}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Check-out</span><span className="font-medium">{checkOut}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-400">Total / ລວມ</span>
              <span className="font-bold text-blue-600">
                {total.toLocaleString()} ₭
                {currency !== "LAK" && (
                  <span className="text-gray-400 font-normal ml-1 text-[10px]">
                    ≈ {CURRENCY_SYMBOL[currency]}{convertPrice(total, currency)}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.push("/history")}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 transition-all">
              ປະຫວັດ / History
            </button>
            <button onClick={() => router.push("/profile")}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold transition-all">
              ໜ້າຫຼັກ / Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN LAYOUT ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10 font-lao">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">

        {/* ── LEFT: Form ────────────────────────────────────── */}
        <div className="flex-[1.3] p-8 md:p-10">

          {/* Back + Currency selector */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => step === "pay" ? setStep("confirm") : router.back()}
              className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft size={14} />
              {step === "pay" ? "ກັບ / Back" : "ກັບ / Back"}
            </button>

            {/* ✅ Currency selector สำหรับลูกค้าต่างชาติ */}
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
              <Globe size={12} className="text-gray-400" />
              {(["LAK", "USD", "THB"] as Currency[]).map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                    currency === c ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-700"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {(["confirm", "pay"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                  step === s ? "bg-blue-600 text-white" :
                  (step === "pay" && s === "confirm") ? "bg-green-500 text-white" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {step === "pay" && s === "confirm" ? <CheckCircle2 size={13}/> : i+1}
                </div>
                <span className={`text-[12px] font-medium ${step === s ? "text-gray-900" : "text-gray-400"}`}>
                  {s === "confirm" ? "ຢືນຢັນ / Confirm" : "ຊຳລະ / Payment"}
                </span>
                {i < 1 && <div className="w-6 h-px bg-gray-200 mx-1"/>}
              </div>
            ))}
          </div>

          {/* ── STEP 1: CONFIRM ─────────────────────────────── */}
          {step === "confirm" && (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">ຫ້ອງ / Room</p>
                <p className="text-[20px] font-bold text-blue-600">{room.name}</p>
                <p className="text-[12px] text-gray-400">{room.view}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-[9px] text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar size={9}/> Check-in
                  </p>
                  <p className="text-[13px] font-semibold text-gray-800">{checkIn}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-[9px] text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar size={9}/> Check-out
                  </p>
                  <p className="text-[13px] font-semibold text-gray-800">{checkOut}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">
                  ຈຳນວນຄົນ / Guests
                </p>
                <div className="relative">
                  <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none appearance-none text-gray-800 cursor-pointer focus:border-blue-300">
                    {Array.from({ length: room.capacity }, (_, i) => i+1).map((n) => (
                      <option key={n} value={n}>{n} ທ່ານ / Guest{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">
                  ຄຳຮ້ອງຂໍພິເສດ / Special Request
                </p>
                <textarea value={special} onChange={(e) => setSpecial(e.target.value)} rows={2}
                  placeholder="ຕ້ອງການຫຍັງພິເສດ? / Any special requests?"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none resize-none text-gray-800 focus:border-blue-300"/>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0"/>
                  <p className="text-red-600 text-[12px]">{error}</p>
                </div>
              )}

              <button onClick={handleConfirm} disabled={loading || days <= 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 size={16} className="animate-spin"/> ກຳລັງດຳເນີນການ...</>
                  : "ຢືນຢັນການຈອງ / Confirm Booking →"}
              </button>
            </div>
          )}

          {/* ── STEP 2: PAY ─────────────────────────────────── */}
          {step === "pay" && (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">
                  ວິທີຊຳລະ / Payment Method
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {/* Bank Transfer */}
                  <button onClick={() => setMethod("transfer")}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      method === "transfer"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${method === "transfer" ? "bg-blue-100" : "bg-gray-100"}`}>
                      <Banknote size={18} className={method === "transfer" ? "text-blue-600" : "text-gray-500"}/>
                    </div>
                    <div>
                      <p className={`text-[13px] font-semibold ${method === "transfer" ? "text-blue-700" : "text-gray-700"}`}>
                        ໂອນເງິນ / Bank Transfer
                      </p>
                      <p className="text-[11px] text-gray-400">
                        ອັບໂຫຼດສລິບ — Admin ກວດສອບ / Upload slip for verification
                      </p>
                    </div>
                  </button>

                  {/* Pay at Hotel — สำหรับลูกค้าต่างชาติ */}
                  <button onClick={() => setMethod("pay_at_hotel")}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      method === "pay_at_hotel"
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${method === "pay_at_hotel" ? "bg-amber-100" : "bg-gray-100"}`}>
                      <Hotel size={18} className={method === "pay_at_hotel" ? "text-amber-600" : "text-gray-500"}/>
                    </div>
                    <div>
                      <p className={`text-[13px] font-semibold ${method === "pay_at_hotel" ? "text-amber-700" : "text-gray-700"}`}>
                        ຈ່າຍທີ່ Hotel / Pay at Hotel
                      </p>
                      <p className="text-[11px] text-gray-400">
                        ຊຳລະໃນວັນ Check-in — ຮອງຮັບ LAK, USD, THB, CNY
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Bank Transfer: ข้อมูลบัญชีและอัปโหลดสลิป */}
              {method === "transfer" && (
                <div className="space-y-3">
                  {/* QR + ข้อมูลธนาคาร */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-[11px] font-semibold text-blue-700 mb-3">
                      📱 ສະແກນ QR ຫຼື ໂອນເຂົ້າ / Scan QR or Transfer to:
                    </p>
                    <div className="flex gap-4 items-center">
                      <Image src="/non.png" alt="QR Code" width={80} height={80}
                        className="rounded-lg border border-blue-200 bg-white p-1"/>
                      <div className="text-[12px] space-y-1">
                        <p className="text-gray-600">ທະນາຄານ / Bank: <span className="font-semibold text-gray-900">BCEL</span></p>
                        <p className="text-gray-600">ເລກບັນຊີ / Account: <span className="font-mono font-semibold text-gray-900">0123-456-789</span></p>
                        <p className="text-gray-600">ຊື່ / Name: <span className="font-semibold text-gray-900">Resort MDNK1</span></p>
                        <p className="text-gray-500 text-[10px]">* ສາມາດໂອນ USD/THB ໄດ້ / USD/THB accepted</p>
                      </div>
                    </div>
                  </div>

                  {/* อัปโหลดสลิป */}
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">
                      ອັບໂຫຼດສລິບ / Upload Slip
                    </p>
                    <input ref={fileRef} type="file"
                      accept="image/jpeg,image/png,image/webp" onChange={handleFileChange}
                      className="hidden"/>
                    <div onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all min-h-[110px]">
                      {slipPreview ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={slipPreview} alt="slip" className="max-h-24 rounded-lg object-contain"/>
                          <button onClick={(e) => {
                            e.stopPropagation()
                            setSlipFile(null)
                            setSlipPreview("")
                          }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                            <X size={12}/>
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={22} className="text-gray-300 mb-2"/>
                          <p className="text-[11px] text-gray-400 font-medium">ກົດເພື່ອເລືອກ / Click to upload</p>
                          <p className="text-[10px] text-gray-300 mt-1">PNG, JPG, WEBP — max 5MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Pay at Hotel: แสดงข้อมูล */}
              {method === "pay_at_hotel" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <p className="text-[12px] font-semibold text-amber-800 flex items-center gap-1.5">
                    <Hotel size={14}/> ໝາຍເຫດ / Important Note
                  </p>
                  <ul className="text-[11px] text-amber-700 space-y-1.5">
                    <li>• ກະລຸນານຳ Booking ID ໄປສະແດງທີ່ Front Desk</li>
                    <li>• Please present your Booking ID at the Front Desk</li>
                    <li>• ຮອງຮັບ: LAK 🇱🇦 · USD 🇺🇸 · THB 🇹🇭 · CNY 🇨🇳</li>
                    <li>• <strong>ການຈອງຈະຖືກຍົກເລີກ ຖ້າຊ້ຳກ່ວາ 30 ນາທີ ຫຼັງ Check-in</strong></li>
                  </ul>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0"/>
                  <p className="text-red-600 text-[12px]">{error}</p>
                </div>
              )}

              <button onClick={handlePay} disabled={loading}
                className={`w-full py-3.5 text-white rounded-xl text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                  method === "pay_at_hotel"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}>
                {loading
                  ? <><Loader2 size={16} className="animate-spin"/> ກຳລັງດຳເນີນການ...</>
                  : method === "pay_at_hotel"
                    ? "✓ ຢືນຢັນ / Confirm Booking"
                    : "✓ ສົ່ງສລິບ / Submit Slip"}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary ────────────────────────────────── */}
        <div className="flex-1 bg-gray-50 border-l border-gray-100 p-8 md:p-10 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">
              ສະຫຼຸບ / Summary
            </p>

            <div className="relative h-36 w-full rounded-xl overflow-hidden mb-4 shadow-sm">
              <Image src={getRoomCover(room)} alt={room.name} fill className="object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "/room.png" }}/>
            </div>

            <h3 className="font-bold text-gray-900 text-[15px] mb-1">{room.name}</h3>
            <p className="text-[11px] text-gray-400 mb-4">{room.view}</p>
            <div className="flex gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1"><Bed size={11}/> {room.bedType}</span>
              <span className="flex items-center gap-1"><Users size={11}/> max {room.capacity}</span>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="space-y-3 pt-5 border-t border-gray-200">
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-400">ລາຄາ / Rate</span>
              <span className="font-medium">
                <PriceDisplay lak={room.price} currency={currency}/> / night
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-400">ຈຳນວນ / Nights</span>
              <span className="font-medium">{days > 0 ? `${days} nights` : "-"}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-400">ຜູ້ເຂົ້າພັກ / Guests</span>
              <span className="font-medium">{guests}</span>
            </div>
            <div className="flex justify-between items-start pt-3 border-t border-gray-200">
              <span className="text-[13px] font-bold text-gray-900">ລວມ / Total</span>
              <div className="text-right">
                <p className="text-[22px] font-black text-blue-600 leading-none">
                  {days > 0 ? (
                    <PriceDisplay lak={total} currency={currency}/>
                  ) : "-"}
                </p>
                {/* แสดงสกุลเงินอื่นเปรียบเทียบ */}
                {days > 0 && currency === "LAK" && (
                  <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                    <p>≈ ${convertPrice(total, "USD")} USD</p>
                    <p>≈ ฿{convertPrice(total, "THB")} THB</p>
                  </div>
                )}
                {days > 0 && currency !== "LAK" && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    = {total.toLocaleString()} ₭ LAK
                  </p>
                )}
                {days > 0 && (
                  <p className="text-[9px] text-gray-300 mt-1">*ອັດຕາໂດຍປະໜານ / Approx. rate</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
