"use client"

import { BarChart, ReportShell, StatCard } from "../_report-kit"

export default function BookingsReportPage() {
  return (
    <ReportShell slug="bookings" title="ລາຍງານສະຖິຕິການຈອງ" subtitle="Booking Statistics — ຈຳນວນການຈອງ, ສະຖານະ ແລະ ຫ້ອງຍອດນິຍົມ">
      {(data) => (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Bookings" value={data.summary.totalBookings} />
            <StatCard label="Avg. Booking Value" value={`${Math.round(data.summary.averageBookingValue).toLocaleString()} kip`} />
            <StatCard label="Occupancy (period)" value={`${data.summary.occupancyRate.toFixed(1)}%`} />
            <StatCard label="No-show Rate" value={`${data.summary.noShowRate.toFixed(1)}%`} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <BarChart title="Booking Status" data={data.bookingStatus.map((item) => ({ label: item.status, value: item.count }))} />
            <BarChart title="Top Rooms" data={data.topRooms.map((item) => ({ label: item.roomName, value: item.bookings }))} format={(value) => `${value} bookings`} />
          </div>
          <div className="mt-5">
            <BarChart title="Monthly Bookings" data={data.monthlyBookings.map((item) => ({ label: item.month, value: item.count }))} format={(value) => `${value} bookings`} />
          </div>
        </>
      )}
    </ReportShell>
  )
}
