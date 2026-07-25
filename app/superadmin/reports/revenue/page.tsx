"use client"

import { BarChart, ReportShell, StatCard, SummaryTable } from "../_report-kit"

export default function RevenueReportPage() {
  return (
    <ReportShell slug="revenue" title="ລາຍງານລາຍຮັບ" subtitle="Revenue — ລາຍໄດ້ລວມ, ສະເລ່ຍຕໍ່ການຈອງ ແລະ ລາຍໄດ້ລາຍວັນ">
      {(data) => (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Revenue" value={`${data.summary.totalRevenue.toLocaleString()} kip`} />
            <StatCard label="Average Booking" value={`${Math.round(data.summary.averageBookingValue).toLocaleString()} kip`} />
            <StatCard label="Bookings" value={data.summary.totalBookings} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <BarChart title="Daily Revenue" data={data.dailyRevenue.map((item) => ({ label: item.date, value: item.revenue }))} format={(value) => `${value.toLocaleString()} kip`} />
            <SummaryTable title="Daily Revenue" rows={data.dailyRevenue.map((item) => [item.date, `${item.revenue.toLocaleString()} kip`])} />
          </div>
        </>
      )}
    </ReportShell>
  )
}
