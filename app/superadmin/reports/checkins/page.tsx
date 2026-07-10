"use client"

import { ReportShell, StatCard, DataTable } from "../_report-kit"

const dt = (s: string) => (s === "-" ? "-" : s.slice(0, 16).replace("T", " "))
const d = (s: string) => (s === "-" ? "-" : s.slice(0, 10))

const DOC_LABEL: Record<string, string> = {
  ID_CARD: "ID Card", PASSPORT: "Passport", OTHER: "Other",
}

export default function CheckInsReportPage() {
  return (
    <ReportShell slug="checkins" title="ລາຍງານການເຂົ້າພັກ" subtitle="Check-ins — ເອກະສານຢືນຢັນຕົວຕົນ ທີ່ເກັບຕອນ Check-in">
      {(data) => {
        const withDoc = data.checkIns.filter((k) => k.docNumber !== "-").length
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard label="Check-ins" value={data.checkIns.length} />
              <StatCard label="With Document" value={withDoc} />
              <StatCard label="Nationalities" value={new Set(data.checkIns.map((k) => k.nationality).filter((n) => n !== "-")).size} />
            </div>
            <DataTable
              title="Check-in Records"
              columns={["Check-in Time", "Guest", "Room", "Doc Type", "Doc Number", "Nationality", "Doc Expiry", "Staff"]}
              rows={data.checkIns.map((k) => [
                dt(k.time), k.guest, k.room,
                DOC_LABEL[k.docType] ?? k.docType,
                <span key="dn" className="font-mono text-[11px]">{k.docNumber}</span>,
                k.nationality, d(k.docExpiry), k.staff,
              ])}
            />
          </>
        )
      }}
    </ReportShell>
  )
}
