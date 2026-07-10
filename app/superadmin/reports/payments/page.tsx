"use client"

import { BarChart, ReportShell, SummaryTable } from "../_report-kit"

export default function PaymentsReportPage() {
  return (
    <ReportShell slug="payments" title="ລາຍງານການຊຳລະ" subtitle="Payments — ສະຖານະ ແລະ ຊ່ອງທາງການຊຳລະເງິນ">
      {(data) => (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <BarChart title="Payment Status" data={data.paymentStatus.map((item) => ({ label: item.status, value: item.count }))} />
            <BarChart title="Payment Method (paid)" data={data.paymentMethod.map((item) => ({ label: item.method, value: item.count }))} format={(value) => `${value}`} />
          </div>
          <div className="mt-5">
            <SummaryTable title="Amount paid by method"
              rows={data.paymentMethod.map((item) => [item.method, `${item.amount.toLocaleString()} kip`])} />
          </div>
        </>
      )}
    </ReportShell>
  )
}
