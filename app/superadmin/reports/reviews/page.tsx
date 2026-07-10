"use client"

import { ReportShell, StatCard, DataTable } from "../_report-kit"

const d = (s: string) => (s === "-" ? "-" : s.slice(0, 10))

export default function ReviewsReportPage() {
  return (
    <ReportShell slug="reviews" title="ລາຍງານຣີວິວ" subtitle="Reviews — ຄະແນນ, ຄຳຄິດເຫັນ ແລະ ການຕອບກັບຂອງພະນັກງານ">
      {(data) => {
        const avg = data.reviews.length
          ? (data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length).toFixed(1)
          : "-"
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard label="Reviews" value={data.reviews.length} />
              <StatCard label="Average Rating" value={`${avg} / 5`} />
              <StatCard label="Replied" value={data.reviews.filter((r) => r.reply !== "-").length} />
            </div>
            <DataTable
              title="Review List"
              columns={["Date", "Guest", "Room", "Rating", "Comment", "Status", "Reply"]}
              rows={data.reviews.map((r) => [
                d(r.date), r.guest, r.room,
                <span key="r" className="font-semibold text-amber-500">{"★".repeat(r.rating)}<span className="text-gray-400">{"★".repeat(5 - r.rating)}</span></span>,
                <span key="c" className="block max-w-[220px] truncate" title={r.comment}>{r.comment}</span>,
                r.status, r.reply,
              ])}
            />
          </>
        )
      }}
    </ReportShell>
  )
}
