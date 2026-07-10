"use client"

import { ReportShell, StatCard, DataTable } from "../_report-kit"

const d = (s: string) => (s === "-" ? "-" : s.slice(0, 10))

const ST_COLOR: Record<string, string> = {
  PENDING: "text-amber-500", APPROVED: "text-green-600", REJECTED: "text-red-500",
}

export default function CancellationsReportPage() {
  return (
    <ReportShell slug="cancellations" title="ລາຍງານການຍົກເລີກ" subtitle="Cancellations — ເຫດຜົນ, ສະຖານະ, ຍອດຄືນເງິນ ແລະ ບັນຊີຮັບເງິນ">
      {(data) => {
        const totalRefund = data.cancellations.reduce((s, c) => s + c.refundAmount, 0)
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard label="Requests" value={data.cancellations.length} />
              <StatCard label="Refundable" value={data.cancellations.filter((c) => c.refundable).length} />
              <StatCard label="Total Refund" value={`${totalRefund.toLocaleString()} kip`} />
            </div>
            <DataTable
              title="Cancellation Requests"
              columns={["Date", "Guest", "Room", "Reason", "Status", "Refund %", "Refund", "Bank Account"]}
              rows={data.cancellations.map((c) => [
                d(c.date), c.guest, c.room,
                <span key="rs" className="block max-w-[200px] truncate" title={c.reason}>{c.reason}</span>,
                <span key="st" className={`font-semibold ${ST_COLOR[c.status] ?? "text-gray-500"}`}>{c.status}</span>,
                `${c.refundPercent}%`,
                <span key="ra" className="font-semibold text-gray-900">{c.refundAmount.toLocaleString()} kip</span>,
                <span key="bk" className="block max-w-[200px] truncate" title={c.bank}>{c.bank}</span>,
              ])}
            />
          </>
        )
      }}
    </ReportShell>
  )
}
