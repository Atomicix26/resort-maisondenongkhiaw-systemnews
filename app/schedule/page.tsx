"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  X, MoreHorizontal, Loader2,
  RefreshCw, Search, CheckCircle2, XCircle,
  LogIn, LogOut as LogOutIcon, CreditCard, Eye,
  FileText, Camera, UserX,
} from "lucide-react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { ProfileMenu } from "@/components/profile-menu"

// ── Types ────────────────────────────────────────────────────────
type BookingStatus = "PENDING"|"CONFIRMED"|"CHECKED_IN"|"CHECKED_OUT"|"COMPLETED"|"CANCELLED"|"NO_SHOW"
type PaymentStatus = "PENDING"|"PENDING_VERIFY"|"PAID"|"FAILED"|"REFUNDED"

interface CheckInDoc {
  docType: string|null; docNumber: string|null; nationality: string|null
  docExpiry: string|null; docImage: string|null
}
interface Booking {
  id: string; status: BookingStatus
  checkIn: string; checkOut: string
  guests: number; totalPrice: number
  actualCheckIn: string|null; actualCheckOut: string|null
  user:  { id: string; name: string|null; lastName: string|null; email: string; phone: string|null }
  room:  { id: string; name: string; roomNumber: string|null }
  transactions: { id: string; type: string; status: PaymentStatus; amount: number; slipImage: string|null }[]
  approval:      { status: string } | null
  cancelRequest: {
    id: string; status: string; reason: string; refundable: boolean
    refundPercent: number|null; refundAmount: number|null
    refundBankName: string|null; refundAccountName: string|null; refundAccountNumber: string|null
  } | null
  checkInLogs?:  CheckInDoc[]
}

// ── Config ───────────────────────────────────────────────────────
const ST_CFG: Record<BookingStatus, { label: string; color: string; dot: string }> = {
  PENDING:     { label: "ລໍຖ້າ",      color: "bg-yellow-100 text-yellow-700",  dot: "bg-yellow-400"  },
  CONFIRMED:   { label: "ຢືນຢັນ",     color: "bg-blue-100   text-blue-700",    dot: "bg-blue-500"    },
  CHECKED_IN:  { label: "Check-in",   color: "bg-purple-100 text-purple-700",  dot: "bg-purple-500"  },
  CHECKED_OUT: { label: "Check-out",  color: "bg-indigo-100 text-indigo-700",  dot: "bg-indigo-500"  },
  COMPLETED:   { label: "ສຳເລັດ",     color: "bg-green-100  text-green-700",   dot: "bg-green-500"   },
  CANCELLED:   { label: "ຍົກເລີກ",    color: "bg-red-100    text-red-600",     dot: "bg-red-400"     },
  NO_SHOW:     { label: "ບໍ່ມາ",      color: "bg-orange-100 text-orange-700",  dot: "bg-orange-400"  },
}
const PAY_CFG: Record<PaymentStatus, { label: string; color: string }> = {
  PENDING:        { label: "ຍັງບໍ່ຊຳລະ",    color: "text-gray-500"   },
  PENDING_VERIFY: { label: "ລໍຕຮວດ slip",  color: "text-orange-500" },
  PAID:           { label: "ຊຳລະແລ້ວ",     color: "text-green-600"  },
  FAILED:         { label: "ຊຳລະຜິດ",      color: "text-red-500"    },
  REFUNDED:       { label: "ຄືນເງິນແລ້ວ",  color: "text-blue-500"   },
}
const DOC_TYPE_LABEL: Record<string, string> = {
  ID_CARD:  "ບັດປະຊາຊົນ",
  PASSPORT: "ພາສປອດ",
  OTHER:    "ອື່ນໆ",
}
const TRANSITIONS: Record<BookingStatus, { status: BookingStatus; label: string; color: string; icon: React.ElementType }[]> = {
  PENDING:     [{ status:"CONFIRMED",  label:"ຢືນຢັນ",   color:"text-blue-600",   icon:CheckCircle2 },
                { status:"NO_SHOW",    label:"ບໍ່ມາ",    color:"text-orange-500", icon:UserX        },
                { status:"CANCELLED",  label:"ຍົກເລີກ",  color:"text-red-500",    icon:XCircle      }],
  CONFIRMED:   [{ status:"CHECKED_IN", label:"Check-in", color:"text-purple-600", icon:LogIn        },
                { status:"NO_SHOW",    label:"ບໍ່ມາ",    color:"text-orange-500", icon:UserX        },
                { status:"CANCELLED",  label:"ຍົກເລີກ",  color:"text-red-500",    icon:XCircle      }],
  CHECKED_IN:  [{ status:"CHECKED_OUT",label:"Check-out",color:"text-indigo-600", icon:LogOutIcon   }],
  CHECKED_OUT: [{ status:"COMPLETED",  label:"ສຳເລັດ",   color:"text-green-600",  icon:CheckCircle2 }],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
}

// ── Detail Modal ─────────────────────────────────────────────────
function BookingDetail({ booking, onClose, onUpdated }: { booking: Booking; onClose: () => void; onUpdated: () => void }) {
  const [saving,       setSaving]       = useState<string|null>(null)
  const [verifying,    setVerifying]    = useState(false)
  const [remarks,      setRemarks]      = useState("")
  const [showReject,   setShowReject]   = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [error,        setError]        = useState("")

  // ── ฟอร์มเอกสารยืนยันตัวตน (ตอน check-in) ──
  const [docType,      setDocType]      = useState("")
  const [docNumber,    setDocNumber]    = useState("")
  const [nationality,  setNationality]  = useState("")
  const [docExpiry,    setDocExpiry]    = useState("")
  const [docFile,      setDocFile]      = useState<File|null>(null)
  const [docPreview,   setDocPreview]   = useState("")
  const docRef = useRef<HTMLInputElement>(null)

  function onDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setDocFile(f)
    setDocPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f) })
  }

  // revoke ObjectURL ตอนปิดโมดัล — กัน memory leak
  useEffect(() => () => { if (docPreview) URL.revokeObjectURL(docPreview) }, [docPreview])

  // ── จัดการคำขอยกเลิก (admin) ──
  const [cancelBusy, setCancelBusy] = useState(false)
  const refundRef = useRef<HTMLInputElement>(null)

  async function actOnCancel(action: "APPROVE" | "REJECT") {
    if (!booking.cancelRequest) return
    setCancelBusy(true); setError("")
    try {
      const res = await fetch(`/api/admin/cancel-requests/${booking.cancelRequest.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "ບໍ່ສຳເລັດ"); setCancelBusy(false); return }
      onUpdated(); onClose()
    } catch { setError("ເກີດຂໍ້ຜິດພາດ"); setCancelBusy(false) }
  }

  async function uploadRefundSlip(file: File) {
    if (!booking.cancelRequest) return
    setCancelBusy(true); setError("")
    try {
      const fd = new FormData(); fd.append("slipFile", file)
      const res = await fetch(`/api/admin/cancel-requests/${booking.cancelRequest.id}`, { method: "PATCH", body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "ບໍ່ສຳເລັດ"); setCancelBusy(false); return }
      onUpdated(); onClose()
    } catch { setError("ເກີດຂໍ້ຜິດພາດ"); setCancelBusy(false) }
  }

  async function changeStatus(status: BookingStatus) {
    setSaving(status); setError("")
    try {
      let res: Response
      if (status === "CHECKED_IN") {
        // check-in → multipart พร้อมเอกสารยืนยันตัวตน + รูปถ่าย
        const fd = new FormData()
        fd.append("status", status)
        fd.append("actualCheckIn", new Date().toISOString())
        if (remarks)     fd.append("checkInRemarks", remarks)
        if (docType)     fd.append("docType", docType)
        if (docNumber)   fd.append("docNumber", docNumber)
        if (nationality) fd.append("nationality", nationality)
        if (docExpiry)   fd.append("docExpiry", docExpiry)
        if (docFile)     fd.append("docImage", docFile)
        res = await fetch(`/api/admin/bookings/${booking.id}`, { method: "PATCH", body: fd })
      } else {
        const body: Record<string, unknown> = { status }
        if (status === "CHECKED_OUT") body.actualCheckOut = new Date().toISOString()
        if (remarks && status === "CHECKED_OUT") body.checkOutRemarks = remarks
        res = await fetch(`/api/admin/bookings/${booking.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "ບໍ່ສຳເລັດ"); setSaving(null); return }
      onUpdated(); onClose()
    } catch {
      setError("ເກີດຂໍ້ຜິດພາດ"); setSaving(null)
    }
  }

  async function verifyPayment(txId: string, status: "PAID"|"FAILED", reason?: string) {
    setVerifying(true); setError("")
    const res  = await fetch(`/api/admin/payments/${txId}/verify`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(status === "FAILED" ? { status, reason } : { status }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "ບໍ່ສຳເລັດ"); setVerifying(false); return }
    onUpdated(); onClose()
  }

  const tx        = booking.transactions.find((t) => t.type === "CHARGE") ?? booking.transactions[0]
  const stCfg     = ST_CFG[booking.status]
  const userName  = [booking.user.name, booking.user.lastName].filter(Boolean).join(" ") || booking.user.email
  const checkInFmt  = new Date(booking.checkIn).toLocaleDateString("lo-LA",  { day: "2-digit", month: "short", year: "numeric" })
  const checkOutFmt = new Date(booking.checkOut).toLocaleDateString("lo-LA", { day: "2-digit", month: "short", year: "numeric" })
  const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"><X size={18} /></button>

        <div className="flex items-center gap-3 mb-5">
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${stCfg.color}`}>{stCfg.label}</span>
          <p className="text-[11px] text-gray-500 font-mono">{booking.id.slice(-8).toUpperCase()}</p>
        </div>

        {/* User + Room */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">ຜູ້ຈອງ</p>
            <p className="text-[13px] font-semibold text-gray-800">{userName}</p>
            <p className="text-[11px] text-gray-500">{booking.user.email}</p>
            {booking.user.phone && <p className="text-[11px] text-gray-500">{booking.user.phone}</p>}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">ຫ້ອງ</p>
            <p className="text-[13px] font-semibold text-gray-800">{booking.room.name}</p>
            <p className="text-[11px] text-gray-500">ຫ້ອງ {booking.room.roomNumber ?? "—"}</p>
            <p className="text-[11px] text-gray-500">{booking.guests} ທ່ານ</p>
          </div>
        </div>

        {/* Dates + Price */}
        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <div className="flex justify-between text-[12px]">
            <div>
              <p className="text-gray-500 text-[11px]">Check-in</p>
              <p className="font-semibold text-gray-800">{checkInFmt}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-[11px]">ຈຳນວນຄືນ</p>
              <p className="font-bold text-blue-700">{nights} ຄືນ</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-[11px]">Check-out</p>
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
            <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard size={11} /> ການຊຳລະເງິນ
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-[12px] font-semibold ${PAY_CFG[tx.status].color}`}>
                {PAY_CFG[tx.status].label}
              </span>
              <span className="text-[12px] font-mono text-gray-700">{Number(tx.amount).toLocaleString()} ₭</span>
            </div>
            {tx.slipImage && (
              <a href={`/api/slips/${encodeURIComponent(tx.slipImage)}`} target="_blank" rel="noreferrer"
                className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-500 hover:underline">
                <Eye size={11} /> ເບິ່ງ slip
              </a>
            )}
            {tx.status === "PENDING_VERIFY" && !showReject && (
              <div className="flex gap-2 mt-3">
                <button disabled={verifying} onClick={() => verifyPayment(tx.id, "PAID")}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[11px] font-bold disabled:opacity-50">
                  ✅ ຢືນຢັນຊຳລະ
                </button>
                <button disabled={verifying} onClick={() => { setError(""); setShowReject(true) }}
                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-bold disabled:opacity-50">
                  ❌ ປະຕິເສດ
                </button>
              </div>
            )}
            {tx.status === "PENDING_VERIFY" && showReject && (
              <div className="mt-3 space-y-2">
                <label className="text-[11px] text-gray-500 font-semibold">ເຫດຜົນໃນການປະຕິເສດ <span className="text-red-500">*</span></label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="ລະບຸເຫດຜົນ ເຊັ່ນ: slip ບໍ່ຖືກຕ້ອງ / ຍອດບໍ່ກົງ..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 bg-white outline-none focus:border-red-300" />
                <div className="flex gap-2">
                  <button disabled={verifying || !rejectReason.trim()}
                    onClick={() => verifyPayment(tx.id, "FAILED", rejectReason.trim())}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[11px] font-bold disabled:opacity-50">
                    {verifying ? "..." : "ຢືນຢັນປະຕິເສດ"}
                  </button>
                  <button disabled={verifying} onClick={() => { setShowReject(false); setRejectReason("") }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[11px] font-bold disabled:opacity-50">
                    ຍົກເລີກ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancel Request + Refund */}
        {booking.cancelRequest && (() => {
          const cr           = booking.cancelRequest
          const refundAmount = cr.refundAmount ? Number(cr.refundAmount) : 0
          const pendingRefund = booking.transactions.some((t) => t.type === "REFUND" && t.status === "PENDING")
          return (
            <div className="bg-red-50 rounded-xl p-3 mb-4 text-[12px] space-y-2.5">
              <p className="font-semibold text-red-700">📋 ຂໍຍົກເລີກ ({cr.status})</p>
              <p className="text-gray-600">{cr.reason}</p>

              {refundAmount > 0 && (
                <div className="bg-white rounded-lg p-2.5 border border-red-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ຍอดคืน ({cr.refundPercent ?? 0}%)</span>
                    <span className="font-bold text-gray-800">{refundAmount.toLocaleString()} ₭</span>
                  </div>
                  {cr.refundBankName && (
                    <p className="text-[11px] text-gray-500">
                      🏦 {cr.refundBankName} · {cr.refundAccountName} · <span className="font-mono">{cr.refundAccountNumber}</span>
                    </p>
                  )}
                </div>
              )}

              {/* PENDING → อนุมัติ/ปฏิเสธ */}
              {cr.status === "PENDING" && (
                <div className="flex gap-2">
                  <button disabled={cancelBusy} onClick={() => actOnCancel("APPROVE")}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[11px] font-bold disabled:opacity-50">
                    ✓ ອະนุมัติยกเลิก{refundAmount > 0 ? " + คืนเงิน" : ""}
                  </button>
                  <button disabled={cancelBusy} onClick={() => actOnCancel("REJECT")}
                    className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-[11px] font-bold disabled:opacity-50">
                    ✕ ປฏิเสธ
                  </button>
                </div>
              )}

              {/* APPROVED + ยังมี refund ค้าง → แนบสลิปโอนคืน */}
              {cr.status === "APPROVED" && pendingRefund && (
                <div>
                  <input ref={refundRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRefundSlip(f) }} />
                  <button disabled={cancelBusy} onClick={() => refundRef.current?.click()}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold disabled:opacity-50">
                    {cancelBusy ? "ກຳລັງດຳເນີນການ..." : "📤 ຢືนยันโอนคืน + แนบสลิป"}
                  </button>
                </div>
              )}
              {cr.status === "APPROVED" && !pendingRefund && refundAmount > 0 && (
                <p className="text-[11px] text-green-600 font-semibold">✓ ໂອนเงินคืนแล้ว</p>
              )}
            </div>
          )
        })()}

        {/* เอกสารยืนยันตัวตน — กรอก/ถ่ายรูปตอน check-in (booking = CONFIRMED) */}
        {booking.status === "CONFIRMED" && (
          <div className="border border-gray-100 rounded-xl p-3 mb-4 space-y-2.5">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={11} /> ເອກະສານຢືນຢັນຕົວຕົນ (ຕອນ Check-in)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select value={docType} onChange={(e) => setDocType(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-2 text-[12px] text-gray-800 bg-white outline-none focus:border-blue-300">
                <option value="">ປະເພດເອກະສານ</option>
                <option value="ID_CARD">ບັດປະຊາຊົນ</option>
                <option value="PASSPORT">ພາສປອດ</option>
                <option value="OTHER">ອື່ນໆ</option>
              </select>
              <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="ເລກທີ່ເອກະສານ"
                className="border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 bg-white outline-none focus:border-blue-300" />
              <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="ສັນຊາດ"
                className="border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 bg-white outline-none focus:border-blue-300" />
              <input type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-700 bg-white outline-none focus:border-blue-300" />
            </div>
            <input ref={docRef} type="file" accept="image/*" capture="environment" onChange={onDocFile} className="hidden" />
            <div onClick={() => docRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
              {docPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={docPreview} alt="doc" className="max-h-28 rounded-lg object-contain" />
              ) : (
                <>
                  <Camera size={20} className="text-gray-400 mb-1" />
                  <p className="text-[11px] text-gray-500">ຖ່າຍຮູບ / ອັບໂຫຼດຮູບເອກະສານ</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* เอกสารที่บันทึกไว้แล้ว (หลัง check-in) — อ่านอย่างเดียว */}
        {booking.checkInLogs?.[0] && (booking.checkInLogs[0].docNumber || booking.checkInLogs[0].docImage) && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-[12px]">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText size={11} /> ເອກະສານຢືນຢັນ (Check-in)
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-gray-600">
              {booking.checkInLogs[0].docType && <span>{DOC_TYPE_LABEL[booking.checkInLogs[0].docType] ?? booking.checkInLogs[0].docType}</span>}
              {booking.checkInLogs[0].docNumber && <span className="font-mono">{booking.checkInLogs[0].docNumber}</span>}
              {booking.checkInLogs[0].nationality && <span>{booking.checkInLogs[0].nationality}</span>}
            </div>
            {booking.checkInLogs[0].docImage && (
              <a href={`/api/checkin-docs/${encodeURIComponent(booking.checkInLogs[0].docImage)}`} target="_blank" rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-blue-500 hover:underline">
                <Eye size={11} /> ເບິ່ງຮູບເອກະສານ
              </a>
            )}
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
            {TRANSITIONS[booking.status].map(({ status, label, icon: Icon }) => (
              <button key={status} disabled={!!saving}
                onClick={() => {
                  // No-show เป็นสถานะสิ้นสุด (ย้อนไม่ได้) → ยืนยันก่อน
                  if (status === "NO_SHOW" &&
                      !window.confirm("ໝາຍ booking ນີ້ເປັນ No-show?\nຫ້ອງຈະຖືກປ່ອຍ ແລະ ບໍ່ຄืນເງິນ (0%)")) return
                  changeStatus(status)
                }}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border-2 flex items-center justify-center gap-1.5
                  ${status === "CANCELLED"
                    ? "border-red-200 text-red-500 hover:bg-red-50"
                    : status === "NO_SHOW"
                    ? "border-orange-200 text-orange-600 hover:bg-orange-50"
                    : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"}
                  disabled:opacity-50 transition-all`}>
                <Icon size={13} />
                {saving === status ? "ກຳລັງ..." : label}
              </button>
            ))}
          </div>
        )}

        {TRANSITIONS[booking.status].length === 0 && (
          <p className="text-center text-[12px] text-gray-500 py-2">ການຈອງນີ້ສິ້ນສຸດແລ້ວ</p>
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

  // ดึง booking ทั้งหมดครั้งเดียว แล้วกรองสถานะ/ค้นหาฝั่ง client
  // เพื่อให้ตัวเลขนับของทุกแท็บถูกต้องเสมอ (ไม่ใช่แค่ตอนเลือก "ทั้งหมด")
  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/bookings`)
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } catch { setBookings([]) }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const timer = window.setTimeout(() => { void fetchBookings() }, 0)
    return () => window.clearTimeout(timer)
  }, [status, fetchBookings])

  const filtered = bookings.filter((b) => {
    if (filterSt !== "ALL" && b.status !== filterSt) return false
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
    NO_SHOW:     bookings.filter((b) => b.status === "NO_SHOW").length,
  }

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={28} className="text-blue-500 animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <AdminSidebar />

      <main className="ml-[210px] flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
          <h1 className="text-[14px] font-bold text-gray-900">ຈັດການການຈອງ</h1>
          <ProfileMenu />
        </header>

        <div className="flex-1 p-8">
          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {(["ALL","PENDING","CONFIRMED","CHECKED_IN","COMPLETED","CANCELLED","NO_SHOW"] as const).map((s) => (
              <button key={s} onClick={() => setFilterSt(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5
                  ${filterSt === s ? "bg-[#0B2447] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {s !== "ALL" && <span className={`w-1.5 h-1.5 rounded-full ${ST_CFG[s].dot}`} />}
                {s === "ALL" ? "ທັງໝົດ" : ST_CFG[s].label}
                <span className="opacity-60">({counts[s as keyof typeof counts] ?? bookings.length})</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="ຄົ້ນຫາ..."
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 bg-white outline-none focus:border-blue-300 w-44" />
              </div>
              <button onClick={fetchBookings} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Table — no overflow-hidden so the row action menu isn't clipped */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-[1fr_140px_120px_120px_70px_120px_80px] gap-2 px-5 py-3 border-b border-gray-200 bg-gray-50/80 rounded-t-2xl">
              {["ຜູ້ຈອງ","ຫ້ອງ","Check-in","Check-out","ຄົນ","ສະຖານະ",""].map((h, i) => (
                <p key={i} className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{h}</p>
              ))}
            </div>

            {loading ? (
              <div className="py-16 flex justify-center"><Loader2 size={24} className="text-blue-400 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-[13px]">ບໍ່ມີຂໍ້ມູນ</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((b) => {
                  const st       = ST_CFG[b.status]
                  const tx       = b.transactions.find((t) => t.type === "CHARGE") ?? b.transactions[0]
                  const userName = [b.user.name, b.user.lastName].filter(Boolean).join(" ") || b.user.email
                  const cin      = new Date(b.checkIn).toLocaleDateString("lo-LA",  { day: "2-digit", month: "short" })
                  const cout     = new Date(b.checkOut).toLocaleDateString("lo-LA", { day: "2-digit", month: "short" })
                  return (
                    <div key={b.id}
                      className="grid grid-cols-[1fr_140px_120px_120px_70px_120px_80px] gap-2 items-center px-5 py-3.5 hover:bg-gray-50/50 transition-colors last:rounded-b-2xl">
                      <div>
                        <p className="text-[13px] font-medium text-gray-800 truncate">{userName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{b.user.email}</p>
                        {tx && (
                          <p className={`text-[11px] font-semibold mt-0.5 ${PAY_CFG[tx.status].color}`}>
                            {PAY_CFG[tx.status].label}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-gray-700">{b.room.name}</p>
                        <p className="text-[11px] text-gray-500">ຫ້ອງ {b.room.roomNumber ?? "—"}</p>
                      </div>
                      <p className="text-[12px] text-gray-600">{cin}</p>
                      <p className="text-[12px] text-gray-600">{cout}</p>
                      <p className="text-[12px] text-gray-500">{b.guests}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="relative flex justify-end">
                        <button onClick={() => setOpenDrop(openDrop === b.id ? null : b.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
                          <MoreHorizontal size={16} />
                        </button>
                        {openDrop === b.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
                            <button onClick={() => { setSelected(b); setOpenDrop(null) }}
                              className="w-full text-left px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium">
                              📋 ລາຍລະອຽດ
                            </button>
                            {/* Check-in ต้องผ่านโมดัล (เก็บเอกสาร) → ตัดออกจาก quick-action */}
                            {TRANSITIONS[b.status].filter(({ status: ns }) => ns !== "CHECKED_IN").map(({ status: ns, label, color }) => (
                              <button key={ns}
                                onClick={async () => {
                                  setOpenDrop(null)
                                  await fetch(`/api/admin/bookings/${b.id}`, {
                                    method: "PATCH", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      status: ns,
                                      ...(ns === "CHECKED_OUT" ? { actualCheckOut: new Date().toISOString() } : {}),
                                    }),
                                  })
                                  fetchBookings()
                                }}
                                className={`w-full text-left px-4 py-2 text-[12px] hover:bg-gray-50 font-medium ${color}`}>
                                {label}
                              </button>
                            ))}
                            {/* ปุ่มลัดเปิดโมดัลเพื่อ Check-in พร้อมเอกสาร */}
                            {TRANSITIONS[b.status].some(({ status: ns }) => ns === "CHECKED_IN") && (
                              <button onClick={() => { setSelected(b); setOpenDrop(null) }}
                                className="w-full text-left px-4 py-2 text-[12px] hover:bg-gray-50 font-medium text-purple-600">
                                Check-in + ເອກະສານ
                              </button>
                            )}
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
