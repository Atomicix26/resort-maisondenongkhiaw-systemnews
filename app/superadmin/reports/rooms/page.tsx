"use client"

import { BarChart, ReportShell, SummaryTable } from "../_report-kit"
import { useLanguage } from "@/components/language-provider"

export default function RoomsReportPage() {
  const { t } = useLanguage()

  return (
    <ReportShell slug="rooms" title="ລາຍງານຫ້ອງພັກ" subtitle="Rooms — ສະຖານະຫ້ອງ ແລະ ຫ້ອງທີ່ມີການຈອງຫຼາຍສຸດ">
      {(data) => (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <BarChart title={t("roomStatus")} data={data.roomStatus.map((item) => ({ label: item.status, value: item.count }))} />
          <SummaryTable title={t("topRoomsByBookings")} rows={data.topRooms.map((item) => [item.roomName, `${item.bookings} ${t("bookings")}`])} />
        </div>
      )}
    </ReportShell>
  )
}
