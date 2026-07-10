"use client"

import { BarChart, ReportShell, SummaryTable } from "../_report-kit"

export default function RoomsReportPage() {
  return (
    <ReportShell slug="rooms" title="ລາຍງານຫ້ອງພັກ" subtitle="Rooms — ສະຖານະຫ້ອງ ແລະ ຫ້ອງທີ່ມີການຈອງຫຼາຍສຸດ">
      {(data) => (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <BarChart title="Room Status" data={data.roomStatus.map((item) => ({ label: item.status, value: item.count }))} />
          <SummaryTable title="Top Rooms (by bookings)" rows={data.topRooms.map((item) => [item.roomName, `${item.bookings} bookings`])} />
        </div>
      )}
    </ReportShell>
  )
}
