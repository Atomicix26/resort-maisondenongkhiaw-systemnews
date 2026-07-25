"use client"

import { useState } from "react"
import { ReportShell, DataTable } from "../_report-kit"

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED", "CANCELLED", "NO_SHOW"] as const

const ST_COLOR: Record<string, string> = {
  PENDING:     "bg-yellow-100 text-yellow-700",
  CONFIRMED:   "bg-blue-100 text-blue-700",
  CHECKED_IN:  "bg-purple-100 text-purple-700",
  CHECKED_OUT: "bg-indigo-100 text-indigo-700",
  COMPLETED:   "bg-green-100 text-green-700",
  CANCELLED:   "bg-red-100 text-red-600",
  NO_SHOW:     "bg-orange-100 text-orange-700",
}

const d = (s: string) => s.slice(0, 10)

export default function BookingListReportPage() {
  const [filter, setFilter] = useState<string>("ALL")

  return (
    <ReportShell slug="booking-list" title="ລາຍງານການຈອງ" subtitle="Booking List — individual bookings in range, filter &amp; export">
      {(data) => {
        const rows = data.bookingList.filter((b) => filter === "ALL" || b.status === filter)
        return (
          <>
            {/* status filter */}
            <div className="flex flex-wrap gap-2 mb-5">
              {STATUSES.map((s) => {
                const count = s === "ALL" ? data.bookingList.length : data.bookingList.filter((b) => b.status === s).length
                return (
                  <button key={s} onClick={() => setFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium
                      ${filter === s ? "bg-[#0B2447] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {s === "ALL" ? "All" : s}
                    <span className="ml-1.5 opacity-60">({count})</span>
                  </button>
                )
              })}
            </div>

            <DataTable
              title="Bookings"
              columns={["Code", "Guest", "Room", "Check-in", "Check-out", "Guests", "Status", "Amount"]}
              empty="No bookings in this range"
              rows={rows.map((b) => [
                <span key="c" className="font-mono text-[11px] text-gray-600">{b.id}</span>,
                <div key="g">
                  <p className="font-medium text-gray-800">{b.guest}</p>
                  <p className="text-[10px] text-gray-400">{b.email}</p>
                </div>,
                b.room,
                d(b.checkIn),
                d(b.checkOut),
                b.guests,
                <span key="s" className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ST_COLOR[b.status] ?? "bg-gray-100 text-gray-600"}`}>{b.status}</span>,
                <span key="a" className="font-semibold text-gray-900">{b.totalPrice.toLocaleString()} ₭</span>,
              ])}
            />
          </>
        )
      }}
    </ReportShell>
  )
}
