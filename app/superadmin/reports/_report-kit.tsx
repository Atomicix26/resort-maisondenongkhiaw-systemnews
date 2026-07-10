"use client"

// Shared building blocks for the SuperAdmin reports.
// Each report lives on its own page (revenue / bookings / payments / rooms)
// so the owner can read one report at a time; they all share this kit and
// the single /api/superadmin/reports endpoint.

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Loader2, Printer, RefreshCw } from "lucide-react"
import Link from "next/link"
import { SuperAdminSidebar } from "@/components/superadmin-sidebar"

export interface ReportData {
  range: { from: string; to: string }
  summary: {
    totalBookings: number
    totalRevenue: number
    averageBookingValue: number
    occupancyRate: number
    noShowRate: number
    cancellationRate: number
    totalUsers: number
    totalStaff: number
  }
  bookingStatus: { status: string; count: number }[]
  paymentStatus: { status: string; count: number }[]
  paymentMethod: { method: string; count: number; amount: number }[]
  monthlyBookings: { month: string; count: number }[]
  roomStatus: { status: string; count: number }[]
  topRooms: { roomId: string; roomName: string; bookings: number; revenue: number }[]
  dailyRevenue: { date: string; revenue: number }[]
  bookingList: { id: string; guest: string; email: string; room: string; checkIn: string; checkOut: string; guests: number; status: string; totalPrice: number; createdAt: string }[]
  // ── detail sections: surface DB fields ที่ไม่ได้แสดงที่อื่น ──
  customers: { name: string; email: string; phone: string; createdAt: string; bookings: number; spent: number }[]
  staff: { name: string; email: string; phone: string; position: string; role: string; salary: number; startDate: string; isActive: boolean }[]
  reviews: { date: string; guest: string; room: string; rating: number; comment: string; status: string; reply: string }[]
  cancellations: { date: string; guest: string; email: string; room: string; reason: string; status: string; refundable: boolean; refundPercent: number; refundAmount: number; bank: string }[]
  checkIns: { time: string; guest: string; room: string; docType: string; docNumber: string; nationality: string; docExpiry: string; staff: string }[]
}

/** Quotes a CSV cell only when it contains a comma, quote or newline. */
function csvCell(value: string | number) {
  const text = String(value ?? "")
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Flattens the whole ReportData into one CSV covering every section. */
function buildReportCsv(data: ReportData): string {
  const lines: string[] = []
  lines.push(`Range,${data.range.from.slice(0, 10)},${data.range.to.slice(0, 10)}`)
  lines.push("")
  lines.push("Summary,Value")
  lines.push(`Total Bookings,${data.summary.totalBookings}`)
  lines.push(`Total Revenue (kip),${data.summary.totalRevenue}`)
  lines.push(`Average Booking Value (kip),${Math.round(data.summary.averageBookingValue)}`)
  lines.push(`Occupancy Rate (%),${data.summary.occupancyRate.toFixed(1)}`)
  lines.push(`No-show Rate (%),${data.summary.noShowRate.toFixed(1)}`)
  lines.push(`Cancellation Rate (%),${data.summary.cancellationRate.toFixed(1)}`)
  lines.push(`Total Users,${data.summary.totalUsers}`)
  lines.push(`Total Staff,${data.summary.totalStaff}`)

  const section = (title: string, header: string, rows: (string | number)[][]) => {
    lines.push("")
    lines.push(title)
    lines.push(header)
    for (const row of rows) lines.push(row.map(csvCell).join(","))
  }

  section("Booking Status", "Status,Count", data.bookingStatus.map((i) => [i.status, i.count]))
  section("Monthly Bookings", "Month,Count", data.monthlyBookings.map((i) => [i.month, i.count]))
  section("Payment Status", "Status,Count", data.paymentStatus.map((i) => [i.status, i.count]))
  section("Payment Method", "Method,Count,Amount (kip)", data.paymentMethod.map((i) => [i.method, i.count, i.amount]))
  section("Room Status", "Status,Count", data.roomStatus.map((i) => [i.status, i.count]))
  section("Top Rooms", "Room,Bookings,Revenue (kip)", data.topRooms.map((i) => [i.roomName, i.bookings, i.revenue]))
  section("Daily Revenue", "Date,Revenue (kip)", data.dailyRevenue.map((i) => [i.date, i.revenue]))
  section(
    "Booking List",
    "Code,Guest,Email,Room,Check-in,Check-out,Guests,Status,Amount (kip)",
    data.bookingList.map((b) => [b.id, b.guest, b.email, b.room, b.checkIn.slice(0, 10), b.checkOut.slice(0, 10), b.guests, b.status, b.totalPrice]),
  )

  return lines.join("\n")
}

/** Triggers a client-side download of the report as a CSV file. */
function downloadReportCsv(data: ReportData, slug: string) {
  // Prepend a BOM so Excel reads the UTF-8 Lao text correctly.
  const blob = new Blob(["﻿" + buildReportCsv(data)], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `report-${slug}-${data.range.from.slice(0, 10)}_${data.range.to.slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** Wraps a single report: handles auth, the date range, fetching and chrome. */
export function ReportShell({
  title, subtitle, slug, children,
}: {
  title: string
  subtitle: string
  slug: string
  children: (data: ReportData) => ReactNode
}) {
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <div className="print:hidden"><SuperAdminSidebar /></div>
      <main className="ml-[210px] flex-1 p-8 print:ml-0 print:p-0">
        <Link href="/superadmin/reports"
          className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 mb-3 print:hidden">
          <ArrowLeft size={13} /> ກັບໄປໜ້າລາຍງານ
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">{title}</h1>
            <p className="text-[12px] text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none" />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none" />
            <button onClick={fetchReports}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-700">
              <RefreshCw size={13} /> Run
            </button>
            <button onClick={() => data && downloadReportCsv(data, slug)} disabled={!data}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <Download size={13} /> CSV
            </button>
            <button onClick={() => window.print()} disabled={!data}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 size={28} className="text-blue-400 animate-spin" /></div>
        ) : data ? (
          children(data)
        ) : null}
      </main>
    </div>
  )
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-[24px] font-bold text-gray-900 mt-2">{value}</p>
    </div>
  )
}

/** Dependency-free horizontal bar chart; bars are sized relative to the max. */
export function BarChart({
  title, data, format = (value) => value.toLocaleString(),
}: {
  title: string
  data: { label: string; value: number }[]
  format?: (value: number) => string
}) {
  const max = Math.max(1, ...data.map((item) => item.value))
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      {data.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-[13px]">No data</div>
      ) : (
        <div className="p-5 space-y-2.5">
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-[11px] text-gray-500" title={item.label}>{item.label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-gray-50">
                <div className="h-full rounded bg-blue-500/80" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
              <span className="w-24 shrink-0 text-right text-[11px] font-semibold text-gray-700">{format(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Scrollable detail table — surfaces raw DB fields as columns/rows. */
export function DataTable({
  title, columns, rows, empty = "No data",
}: {
  title: string
  columns: string[]
  rows: ReactNode[][]
  empty?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-blue-50/60 flex items-center justify-between">
        <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">{title}</p>
        <span className="text-[11px] text-gray-500">{rows.length} ລາຍການ</span>
      </div>
      {rows.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-[13px]">{empty}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {columns.map((c) => (
                  <th key={c} className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 text-[12px] text-gray-700 whitespace-nowrap">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function SummaryTable({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-[13px]">No data</div>
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
