"use client"

import { ReportShell, StatCard, DataTable } from "../_report-kit"

const d = (s: string) => (s === "-" ? "-" : s.slice(0, 10))

export default function CustomersReportPage() {
  return (
    <ReportShell slug="customers" title="ລາຍງານລູກຄ້າ" subtitle="Customers — ຂໍ້ມູນລູກຄ້າ, ເບີໂທ, ຈຳນວນຈອງ ແລະ ຍອດໃຊ້ຈ່າຍ">
      {(data) => {
        const totalSpent = data.customers.reduce((s, c) => s + c.spent, 0)
        const withBookings = data.customers.filter((c) => c.bookings > 0).length
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard label="Customers" value={data.customers.length} />
              <StatCard label="With Bookings" value={withBookings} />
              <StatCard label="Total Spent" value={`${totalSpent.toLocaleString()} kip`} />
            </div>
            <DataTable
              title="Customer List"
              columns={["Name", "Email", "Phone", "Joined", "Bookings", "Total Spent"]}
              rows={data.customers.map((c) => [
                c.name, c.email, c.phone, d(c.createdAt), c.bookings,
                <span key="s" className="font-semibold text-gray-900">{c.spent.toLocaleString()} kip</span>,
              ])}
            />
          </>
        )
      }}
    </ReportShell>
  )
}
