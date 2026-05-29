"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  CheckCircle2, Upload, X, ArrowLeft,
  Bed, Users, Calendar, CreditCard, Banknote,
  Loader2, ChevronDown,
} from "lucide-react"

// ── Types ───────────────────────────────────────────────────────
interface Room {
  id:        string
  name:      string
  price:     number
  capacity:  number
  bedType:   string
  view:      string | null
  images:    string[]
  amenities: string[]
}

type Step = "confirm" | "pay" | "success"
type PayMethod = "transfer" | "credit_card"

// ── Helpers ─────────────────────────────────────────────────────
function calcDays(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}
function fmt(n: number) { return n.toLocaleString() }
function getRoomCover(room: Room) {
  if (room.images?.[0] && !room.images[0].includes("placeholder")) return room.images[0]
  return "/room.png"
}

// ════════════════════════════════════════════════════════════════
export default function PaymentPage() {
  const router       = useRouter()
  const params       = useSearchParams()
  const { data: session, status } = useSession()

  const roomId   = params.get("roomId")   ?? ""
  const checkIn  = params.get("checkIn")  ?? ""
  const checkOut = params.get("checkOut") ?? ""

  const [room,      setRoom]      = useState<Room | null>(null)
  const [loadRoom,  setLoadRoom]  = useState(true)
  const [step,      setStep]      = useState<Step>("confirm")
  const [guests,    setGuests]    = useState(1)
  const [special,   setSpecial]   = useState("")
  const [bookingId, setBookingId] = useState("")

  // Payment
  const [method,      setMethod]      = useState<PayMethod>("transfer")
  const [cardNumber,  setCardNumber]  = useState("")
  const [slipFile,    setSlipFile]    = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState("")
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // redirect ถ้าไม่ได้ login
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  // fetch room
  useEffect(() => {
    if (!roomId) return

    fetch("/api/rooms")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok || !Array.isArray(data)) {
          console.error("[PAYMENT_FETCH_ROOM] invalid response", data)
          return null
        }
        return data as Room[]
      })
      .then((rooms) => {
        if (!rooms) return setRoom(null)
        const found = rooms.find((r) => r.id === roomId)
        setRoom(found ?? null)
      })
      .catch((error) => {
        console.error("[PAYMENT_FETCH_ROOM]", error)
        setRoom(null)
      })
      .finally(() => setLoadRoom(false))
  }, [roomId])

  const days  = calcDays(checkIn, checkOut)
  const total = room ? days * room.price : 0

  // ── Step 1: Confirm → create booking ──────────────────────────
  async function handleConfirm() {
    if (!room || days <= 0) { setError("ວັນທີບໍ່ຖືກຕ້ອງ"); return }
    setError("")
    setLoading(true)
    try {
      const res  = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId, checkIn, checkOut,
          guests:       guests.toString(),
          totalPrice:   total.toString(),
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

  // ── Step 2: Pay ────────────────────────────────────────────────
  async function handlePay() {
    setError("")
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("bookingId", bookingId)
      fd.append("method", method)
      if (method === "transfer" && slipFile) fd.append("slipFile", slipFile)
      if (method === "credit_card") fd.append("cardNumber", cardNumber.replace(/\s/g, ""))

      const res  = await fetch("/api/payment", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? "ຊຳລະບໍ່ສຳເລັດ"); return }
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

  function formatCard(val: string) {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
  }

  // ── Loading / error states ─────────────────────────────────────
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
        <p className="text-gray-500 text-[14px]">ບໍ່ພົບຂໍ້ມູນຫ້ອງ</p>
        <button onClick={() => router.push("/")} className="text-blue-600 text-[13px] hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> ກັບຄືນໜ້າຫຼັກ
        </button>
      </div>
    )
  }

  // ── SUCCESS ────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-lao px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {method === "transfer" ? "ອັບໂຫຼດສລິບສຳເລັດ!" : "ຊຳລະເງິນສຳເລັດ!"}
          </h2>
          <p className="text-[13px] text-gray-500 mb-1">
            {method === "transfer"
              ? "ກຳລັງລໍຖ້າ Admin ກວດສອບ ຈະແຈ້ງຜ່ານ Email"
              : "ການຈອງຂອງທ່ານໄດ້ຮັບການຢືນຢັນແລ້ວ"}
          </p>
          <p className="text-[11px] text-gray-400 mb-1">Booking ID: <span className="font-mono">{bookingId}</span></p>

          <div className="bg-gray-50 rounded-xl p-4 my-5 text-left space-y-2 text-[12px]">
            <div className="flex justify-between">
              <span className="text-gray-400">ຫ້ອງ</span>
              <span className="font-medium">{room.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Check-in</span>
              <span className="font-medium">{checkIn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Check-out</span>
              <span className="font-medium">{checkOut}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ລວມທັງໝົດ</span>
              <span className="font-bold text-blue-600">{fmt(total)} ₭</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.push("/history")}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 transition-all">
              ປະຫວັດການຈອງ
            </button>
            <button onClick={() => router.push("/profile")}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold transition-all">
              ກັບສູ່ໜ້າຫຼັກ
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── LAYOUT ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10 font-lao">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">

        {/* ── LEFT: Form ──────────────────────────────────────── */}
        <div className="flex-[1.3] p-8 md:p-12">

          {/* Back */}
          <button onClick={() => step === "pay" ? setStep("confirm") : router.back()}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-700 mb-6 transition-colors">
            <ArrowLeft size={14} />
            {step === "pay" ? "ກັບໄປຢືນຢັນ" : "ກັບຄືນ"}
          </button>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-8">
            {(["confirm", "pay"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                  step === s ? "bg-blue-600 text-white" :
                  (step === "pay" && s === "confirm") ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {step === "pay" && s === "confirm" ? <CheckCircle2 size={13} /> : i + 1}
                </div>
                <span className={`text-[12px] font-medium ${step === s ? "text-gray-900" : "text-gray-400"}`}>
                  {s === "confirm" ? "ຢືນຢັນຂໍ້ມູນ" : "ຊຳລະເງິນ"}
                </span>
                {i < 1 && <div className="w-8 h-px bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: CONFIRM ─────────────────────────────── */}
          {step === "confirm" && (
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">ຫ້ອງທີ່ເລືອກ</p>
                <p className="text-[20px] font-bold text-blue-600">{room.name}</p>
                <p className="text-[12px] text-gray-400">{room.view}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#E9F0F6] rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">ວັນທີເຂົ້າພັກ</p>
                  <p className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
                    <Calendar size={13} className="text-blue-500" />{checkIn}
                  </p>
                </div>
                <div className="bg-[#E9F0F6] rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">ວັນທີເຊັກເອົາ</p>
                  <p className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
                    <Calendar size={13} className="text-blue-500" />{checkOut}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">ຈຳນວນຄົນ</p>
                <div className="relative">
                  <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full bg-[#E9F0F6] rounded-lg px-4 py-3 text-[13px] outline-none appearance-none text-gray-800 cursor-pointer">
                    {Array.from({ length: room.capacity }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} ທ່ານ</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">ຄຳຮ້ອງຂໍພິເສດ (ຖ້າມີ)</p>
                <textarea value={special} onChange={(e) => setSpecial(e.target.value)} rows={2}
                  placeholder="ຕ້ອງການອາຫານພິເສດ, ຮ້ອງຂໍຫ້ອງຊັ້ນສູງ..."
                  className="w-full bg-[#E9F0F6] rounded-lg px-4 py-3 text-[13px] outline-none resize-none text-gray-800"
                />
              </div>

              {error && <p className="text-red-500 text-[12px]">{error}</p>}

              <button onClick={handleConfirm} disabled={loading || days <= 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> ກຳລັງດຳເນີນການ...</> : "ຢືນຢັນການຈອງ →"}
              </button>
            </div>
          )}

          {/* ── STEP 2: PAY ─────────────────────────────────── */}
          {step === "pay" && (
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">ວິທີຊຳລະເງິນ</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setMethod("transfer")}
                    className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-[13px] font-medium transition-all ${
                      method === "transfer" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    <Banknote size={18} /> ໂອນເງິນ
                  </button>
                  <button onClick={() => setMethod("credit_card")}
                    className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-[13px] font-medium transition-all ${
                      method === "credit_card" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    <CreditCard size={18} /> ບັດເຄຣດິດ
                  </button>
                </div>
              </div>

              {/* Transfer */}
              {method === "transfer" && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">ອັບໂຫຼດສລິບ</p>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all min-h-[120px]">
                    {slipPreview ? (
                      <div className="relative">
                        <img src={slipPreview} alt="slip" className="max-h-28 rounded-lg object-contain" />
                        <button onClick={(e) => { e.stopPropagation(); setSlipFile(null); setSlipPreview("") }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="text-gray-300 mb-2" />
                        <p className="text-[11px] text-gray-400 font-medium">ກົດເພື່ອເລືອກຮູບສລິບ</p>
                        <p className="text-[10px] text-gray-300 mt-1">PNG, JPG ຂະໜາດສູງສຸດ 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Credit Card */}
              {method === "credit_card" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">ເລກບັດ (16 ຕົວ)</p>
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCard(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      className="w-full bg-[#E9F0F6] rounded-lg px-4 py-3 text-[14px] font-mono outline-none tracking-widest"
                      maxLength={19}
                    />
                  </div>
                  <p className="text-[11px] text-amber-500">⚠ ລະບົບທົດສອບ — ບໍ່ຕ້ອງໃສ່ເລກຈິງ</p>
                </div>
              )}

              {error && <p className="text-red-500 text-[12px]">{error}</p>}

              <button onClick={handlePay} disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> ກຳລັງດຳເນີນການ...</> : "ຢືນຢັນຊຳລະເງິນ ✓"}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary ──────────────────────────────────── */}
        <div className="flex-1 bg-[#F8FAFC] border-l border-gray-100 p-8 md:p-10 flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">ສະຫຼຸບການຈອງ</p>

            {/* Room Image */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden mb-5 shadow-sm">
              <Image src={getRoomCover(room)} alt={room.name} fill className="object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "/room.png" }} />
            </div>

            <h3 className="font-bold text-gray-900 text-[16px] mb-1">{room.name}</h3>
            <p className="text-[12px] text-gray-400 mb-4">{room.view}</p>

            {/* Room details */}
            <div className="flex gap-4 text-[11px] text-gray-500 mb-5">
              <span className="flex items-center gap-1"><Bed   size={11}/> {room.bedType}</span>
              <span className="flex items-center gap-1"><Users size={11}/> max {room.capacity}</span>
            </div>

            {/* QR Code (สำหรับโอนเงิน) */}
            {method === "transfer" && step === "pay" && (
              <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col items-center mb-4 shadow-sm">
                <Image src="/non.png" alt="QR Code" width={90} height={90} className="object-contain mb-2" />
                <p className="text-[10px] text-gray-400 font-medium">ສະແກນ QR ໂອນເງິນ</p>
              </div>
            )}
          </div>

          {/* Price breakdown */}
          <div className="space-y-3 pt-5 border-t border-gray-200">
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-400">ລາຄາ / ມື້</span>
              <span className="font-medium text-gray-800">{fmt(room.price)} ₭</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-400">ຈຳນວນວັນ</span>
              <span className="font-medium text-gray-800">{days > 0 ? `${days} ມື້` : "-"}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-400">ຈຳນວນຄົນ</span>
              <span className="font-medium text-gray-800">{guests} ທ່ານ</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-[13px] font-bold text-gray-900">ລວມທັງໝົດ</span>
              <span className="text-[22px] font-black text-blue-600">
                {days > 0 ? `${fmt(total)} ₭` : "-"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}