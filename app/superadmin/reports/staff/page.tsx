"use client"

import { ReportShell, StatCard, DataTable } from "../_report-kit"

const d = (s: string) => (s === "-" ? "-" : s.slice(0, 10))

export default function StaffReportPage() {
  return (
    <ReportShell slug="staff" title="ລາຍງານພະນັກງານ" subtitle="Staff — ຕຳແໜ່ງ, ບົດບາດ, ເງິນເດືອນ ແລະ ວັນເລີ່ມວຽກ">
      {(data) => {
        const payroll = data.staff.filter((s) => s.isActive).reduce((sum, s) => sum + s.salary, 0)
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard label="Staff" value={data.staff.length} />
              <StatCard label="Active" value={data.staff.filter((s) => s.isActive).length} />
              <StatCard label="Monthly Payroll" value={`${payroll.toLocaleString()} kip`} />
            </div>
            <DataTable
              title="Staff List"
              columns={["Name", "Email", "Position", "Role", "Salary", "Start Date", "Status"]}
              rows={data.staff.map((s) => [
                s.name, s.email, s.position, s.role,
                <span key="sl" className="font-semibold text-gray-900">{s.salary.toLocaleString()} kip</span>,
                d(s.startDate),
                <span key="ac" className={`font-semibold ${s.isActive ? "text-green-600" : "text-gray-500"}`}>{s.isActive ? "Active" : "Inactive"}</span>,
              ])}
            />
          </>
        )
      }}
    </ReportShell>
  )
}
