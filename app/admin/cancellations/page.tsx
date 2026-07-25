"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Loader2, RefreshCw, Check, X, Upload, Ban, Banknote, CheckCircle2, QrCode,
} from "lucide-react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { ProfileMenu } from "@/components/profile-menu"
import { TranslationKey, useLanguage } from "@/components/language-provider"

// ── Types ────────────────────────────────────────────────────────
type CancelStatus = "PENDING" | "APPROVED" | "REJECTED"

interface CancelRow {
  id: string
  status: CancelStatus
  reason: string
  refundable: boolean
  refundPercent: number | null
  refundAmount: number
  bank: { name: string; holder: string; number: string }
  refundQrImage: string
  requestDate: string
  actionDate: string | null
  guest: string
  email: string
  phone: string
  booking: {
    id: string; room: string; roomNumber: string | null
    checkIn: string; checkOut: string; totalPrice: number; status: string
  }
  refund: { id: string; status: string; amount: number; hasSlip: boolean; slipImage: string } | null
}

const ST_CFG: Record<CancelStatus, { labelKey: TranslationKey; color: string }> = {
  PENDING:  { labelKey: "statusPending",  color: "bg-amber-100 text-amber-700" },
  APPROVED: { labelKey: "statusApproved", color: "bg-green-100 text-green-700" },
  REJECTED: { labelKey: "statusRejected", color: "bg-red-100 text-red-600" },
}

const d = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

export default function AdminCancellationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()

  const [rows, setRows] = useState<CancelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CancelStatus | "ALL">("ALL")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const slipInput = useRef<HTMLInputElement | null>(null)
  const slipTarget = useRef<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role === "USER") router.push("/unauthorized")
  }, [status, session, router])

  const fetchRows = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/admin/cancel-requests")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setRows([]); setError(err instanceof Error ? err.message : "Failed to load")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const t = window.setTimeout(() => { void fetchRows() }, 0)
    return () => window.clearTimeout(t)
  }, [status, fetchRows])

  // อนุมัติ / ปฏิเสธ (JSON)
  async function decide(id: string, action: "APPROVE" | "REJECT") {
    if (action === "REJECT" && !window.confirm(t("confirmRejectCancellation"))) return
    setBusy(id); setError("")
    try {
      const res = await fetch(`/api/admin/cancel-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally { setBusy(null) }
  }

  // เลือกไฟล์สลิป → อัปโหลดยืนยันโอนคืน (multipart)
  function pickSlip(id: string) { slipTarget.current = id; slipInput.current?.click() }
  async function onSlipChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const id = slipTarget.current
    e.target.value = ""
    if (!file || !id) return
    setBusy(id); setError("")
    try {
      const fd = new FormData()
      fd.append("slipFile", file)
      const res = await fetch(`/api/admin/cancel-requests/${id}`, { method: "PATCH", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally { setBusy(null); slipTarget.current = null }
  }

  const filtered = rows.filter((r) => filter === "ALL" || r.status === filter)
  const counts = {
    ALL: rows.length,
    PENDING: rows.filter((r) => r.status === "PENDING").length,
    APPROVED: rows.filter((r) => r.status === "APPROVED").length,
    REJECTED: rows.filter((r) => r.status === "REJECTED").length,
  }
  const pendingRefunds = rows.filter((r) => r.refund && r.refund.status === "PENDING").length

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-lao">
      <AdminSidebar />
      <input ref={slipInput} type="file" accept="image/*" hidden onChange={onSlipChosen} />

      <main className="flex-1 ml-[210px] p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 flex items-center gap-2">
              <Ban size={20} className="text-blue-600" /> {t("cancellationsRefunds")}
            </h1>
            <p className="text-[12px] text-gray-500 mt-1">
              {t("cancellationsSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchRows}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50">
              <RefreshCw size={13} /> {t("refresh")}
            </button>
            <ProfileMenu />
          </div>
        </div>

        {/* summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <SummaryCard label={t("statusPending")} value={counts.PENDING} tone="amber" />
          <SummaryCard label={t("statusApproved")} value={counts.APPROVED} tone="green" />
          <SummaryCard label={t("statusRejected")} value={counts.REJECTED} tone="red" />
          <SummaryCard label={t("refundsToTransfer")} value={pendingRefunds} tone="blue" />
        </div>

        {/* filter chips */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((item) => (
            <button key={item} onClick={() => setFilter(item)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium
                ${filter === item ? "bg-[#0B2447] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {item === "ALL" ? t("all") : t(ST_CFG[item].labelKey)}
              <span className="ml-1.5 opacity-60">({counts[item]})</span>
            </button>
          ))}
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 size={24} className="text-blue-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400 text-[13px]">
            {t("noCancellationRequests")}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const st = ST_CFG[r.status]
              const isBusy = busy === r.id
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* left: guest + booking */}
                    <div className="min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-gray-900">{r.guest}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.color}`}>{t(st.labelKey)}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                      <p className="text-[12px] text-gray-700 mt-2">
                        {r.booking.room}{r.booking.roomNumber ? ` · ${r.booking.roomNumber}` : ""}
                      </p>
                      <p className="text-[11px] text-gray-500">{d(r.booking.checkIn)} → {d(r.booking.checkOut)}</p>
                      <p className="text-[11px] text-gray-400 mt-1 font-mono">{r.booking.id}</p>
                    </div>

                    {/* middle: reason + refund */}
                    <div className="flex-1 min-w-[240px]">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t("reason")}</p>
                      <p className="text-[12px] text-gray-700 mt-0.5">{r.reason}</p>

                      <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500">{t("bookingTotal")}</span>
                          <span className="text-[12px] font-semibold text-gray-800">{r.booking.totalPrice.toLocaleString()} ₭</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] text-gray-500">{t("refund")} ({r.refundPercent ?? 0}%)</span>
                          <span className={`text-[13px] font-bold ${r.refundAmount > 0 ? "text-blue-600" : "text-gray-400"}`}>
                            {r.refundAmount.toLocaleString()} ₭
                          </span>
                        </div>
                        {r.bank.number && (
                          <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
                            <Banknote size={12} className="text-gray-400" />
                            {r.bank.name} · {r.bank.holder} · {r.bank.number}
                          </p>
                        )}
                        {r.refundQrImage && (
                          <a
                            href={`/api/slips/${r.refundQrImage}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            <QrCode size={12} className="text-gray-400" />
                            {t("viewRefundQr")}
                          </a>
                        )}
                        {r.refundAmount > 0 && !r.bank.number && !r.refundQrImage && (
                          <p className="text-[11px] text-red-500 mt-2 font-semibold">
                            {t("missingRefundAccount")}
                          </p>
                        )}
                        {!r.refundable && (
                          <p className="text-[11px] text-gray-400 mt-2">{t("noRefund")}</p>
                        )}
                      </div>
                    </div>

                    {/* right: actions */}
                    <div className="flex flex-col gap-2 w-[190px]">
                      {r.status === "PENDING" && (
                        <>
                          <button disabled={isBusy} onClick={() => decide(r.id, "APPROVE")}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-[12px] font-semibold disabled:opacity-50">
                            {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} {t("approve")}
                          </button>
                          <button disabled={isBusy} onClick={() => decide(r.id, "REJECT")}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 text-[12px] font-semibold disabled:opacity-50">
                            <X size={14} /> {t("reject")}
                          </button>
                        </>
                      )}

                      {/* refund transfer step (after APPROVED, if money owed) */}
                      {r.status === "APPROVED" && r.refund && (
                        r.refund.status === "PAID" ? (
                          <>
                            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-50 text-green-700 px-3 py-2 text-[12px] font-semibold">
                              <CheckCircle2 size={14} /> {t("refunded")}
                            </span>
                            {r.refund.slipImage && (
                              <a
                                href={`/api/slips/${r.refund.slipImage}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 text-[12px] font-semibold"
                              >
                                {t("viewSlip")}
                              </a>
                            )}
                          </>
                        ) : (
                          <button disabled={isBusy} onClick={() => pickSlip(r.id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-[12px] font-semibold disabled:opacity-50">
                            {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={14} />} {t("uploadSlip")}
                          </button>
                        )
                      )}
                      {r.status === "APPROVED" && !r.refund && (
                        <span className="text-[11px] text-gray-400 text-center">{t("noTransferNeeded")}</span>
                      )}
                      {r.actionDate && (
                        <p className="text-[10px] text-gray-400 text-center mt-1">{t("actioned")} {d(r.actionDate)}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "green" | "red" | "blue" }) {
  const map = {
    amber: "text-amber-600", green: "text-green-600", red: "text-red-600", blue: "text-blue-600",
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className={`text-[24px] font-bold leading-none ${map[tone]}`}>{value}</p>
      <p className="text-[12px] font-medium text-gray-600 mt-1.5">{label}</p>
    </div>
  )
}
