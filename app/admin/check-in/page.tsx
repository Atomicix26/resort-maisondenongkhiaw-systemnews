"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Loader2, RefreshCw, DoorOpen, LogIn, LogOut, X, Camera,
  BedDouble, Banknote, CheckCircle2, Clock,
} from "lucide-react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { ProfileMenu } from "@/components/profile-menu"

// ── Types ────────────────────────────────────────────────────────
interface Row {
  id: string
  guest: string; email: string; phone: string
  room: string; roomNumber: string | null
  checkIn: string; checkOut: string; guests: number
  totalPrice: number
  payAtHotel: boolean; paid: boolean
  dueOut?: boolean
}
interface Feed { date: string; arrivals: Row[]; inHouse: Row[] }

const DOC_TYPES = [
  { value: "ID_CARD", label: "ID Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "OTHER", label: "Other" },
]

const time = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })

// ── Check-in modal (document capture) ────────────────────────────
function CheckInModal({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const [docType, setDocType] = useState("ID_CARD")
  const [docNumber, setDocNumber] = useState("")
  const [nationality, setNationality] = useState("")
  const [docExpiry, setDocExpiry] = useState("")
  const [remarks, setRemarks] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError("")
    try {
      const fd = new FormData()
      fd.append("status", "CHECKED_IN")
      fd.append("actualCheckIn", new Date().toISOString())
      fd.append("docType", docType)
      if (docNumber) fd.append("docNumber", docNumber)
      if (nationality) fd.append("nationality", nationality)
      if (docExpiry) fd.append("docExpiry", docExpiry)
      if (remarks) fd.append("checkInRemarks", remarks)
      if (file) fd.append("docImage", file)
      const res = await fetch(`/api/admin/bookings/${row.id}`, { method: "PATCH", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <h2 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
          <LogIn size={17} className="text-blue-600" /> Check-in
        </h2>
        <p className="text-[12px] text-gray-500 mt-0.5">{row.guest} · {row.room}{row.roomNumber ? ` (${row.roomNumber})` : ""}</p>

        {row.payAtHotel && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-800 flex items-start gap-2">
            <Banknote size={14} className="mt-0.5 shrink-0" />
            Pay at hotel — collect <b>{row.totalPrice.toLocaleString()} ₭</b> in cash. Checking in marks it paid.
          </div>
        )}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">Document type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400">
                {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">Document no.</label>
              <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="1-2345-…"
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">Nationality</label>
              <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Lao"
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-[11px] text-gray-600 font-semibold">Doc expiry</label>
              <input type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-gray-600 font-semibold">Remarks</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="optional"
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 bg-white outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[11px] text-gray-600 font-semibold">Document photo</label>
            <label className="mt-1 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 text-[12px] text-gray-500 cursor-pointer hover:bg-gray-50">
              <Camera size={15} className="text-gray-400" />
              {file ? file.name : "Upload / take a photo"}
              <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {error && <p className="text-red-500 text-[12px]">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={15} />} Confirm check-in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────
export default function AdminCheckInPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [feed, setFeed] = useState<Feed | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [checkInRow, setCheckInRow] = useState<Row | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role === "USER") router.push("/unauthorized")
  }, [status, session, router])

  const fetchFeed = useCallback(async (dt: string) => {
    setLoading(true); setError("")
    try {
      const res = await fetch(`/api/admin/frontdesk?date=${dt}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setFeed(data)
    } catch (err) {
      setFeed(null); setError(err instanceof Error ? err.message : "Failed to load")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const t = window.setTimeout(() => { void fetchFeed(date) }, 0)
    return () => window.clearTimeout(t)
  }, [status, date, fetchFeed])

  async function checkOut(row: Row) {
    if (!window.confirm(`Check out ${row.guest} from ${row.room}?`)) return
    setBusy(row.id); setError("")
    try {
      const res = await fetch(`/api/admin/bookings/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CHECKED_OUT", actualCheckOut: new Date().toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      await fetchFeed(date)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally { setBusy(null) }
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-lao">
      <AdminSidebar />
      {checkInRow && (
        <CheckInModal row={checkInRow} onClose={() => setCheckInRow(null)}
          onDone={() => { setCheckInRow(null); void fetchFeed(date) }} />
      )}

      <main className="flex-1 ml-[210px] p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 flex items-center gap-2">
              <DoorOpen size={20} className="text-blue-600" /> Check-in / Check-out
            </h1>
            <p className="text-[12px] text-gray-500 mt-1">Front-desk worklist — arrivals to check in and guests due to check out.</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-700 bg-white outline-none focus:border-blue-300" />
            <button onClick={() => fetchFeed(date)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50">
              <RefreshCw size={13} /> Refresh
            </button>
            <ProfileMenu />
          </div>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 size={24} className="text-blue-400 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Arrivals */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <LogIn size={15} className="text-green-600" />
                <h2 className="text-[13px] font-bold text-gray-800">Arrivals</h2>
                <span className="text-[11px] text-gray-400">({feed?.arrivals.length ?? 0})</span>
              </div>
              <div className="space-y-2.5">
                {(feed?.arrivals.length ?? 0) === 0 ? (
                  <EmptyCard text="No arrivals to check in" />
                ) : feed!.arrivals.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{r.guest}</p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <BedDouble size={12} className="text-gray-400" />
                        {r.room}{r.roomNumber ? ` · ${r.roomNumber}` : ""} · {r.guests} pax
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{time(r.checkIn)} → {time(r.checkOut)}</p>
                      <div className="mt-1.5">
                        {r.payAtHotel ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
                            <Banknote size={10} /> Collect {r.totalPrice.toLocaleString()} ₭
                          </span>
                        ) : r.paid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-semibold">
                            <CheckCircle2 size={10} /> Paid
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button onClick={() => setCheckInRow(r)}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-[12px] font-semibold">
                      <LogIn size={14} /> Check in
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* In-house / Check-out */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <LogOut size={15} className="text-indigo-600" />
                <h2 className="text-[13px] font-bold text-gray-800">In-house</h2>
                <span className="text-[11px] text-gray-400">({feed?.inHouse.length ?? 0})</span>
              </div>
              <div className="space-y-2.5">
                {(feed?.inHouse.length ?? 0) === 0 ? (
                  <EmptyCard text="No guests in house" />
                ) : feed!.inHouse.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{r.guest}</p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <BedDouble size={12} className="text-gray-400" />
                        {r.room}{r.roomNumber ? ` · ${r.roomNumber}` : ""} · {r.guests} pax
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={11} /> out {time(r.checkOut)}
                      </p>
                      {r.dueOut && (
                        <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-semibold">
                          Due to check out
                        </span>
                      )}
                    </div>
                    <button disabled={busy === r.id} onClick={() => checkOut(r)}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 py-2 text-[12px] font-semibold disabled:opacity-50">
                      {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={14} />} Check out
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-10 text-center text-gray-400 text-[12px]">{text}</div>
}
