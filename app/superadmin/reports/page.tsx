"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  TrendingUp, CalendarCheck2, CreditCard, BedDouble,
  Loader2, ChevronRight, Users, UserCog, Star, Ban, LogIn, ClipboardList,
} from "lucide-react"
import { SuperAdminSidebar } from "@/components/superadmin-sidebar"
import { ProfileMenu } from "@/components/profile-menu"

// Each report is its own page so the owner reads them one at a time
// instead of one crowded combined dashboard.
const REPORTS = [
  {
    icon: TrendingUp,
    title: "ລາຍງານລາຍຮັບ",
    subtitle: "Revenue — ລາຍໄດ້ລວມ, ສະເລ່ຍຕໍ່ການຈອງ ແລະ ລາຍໄດ້ລາຍວັນ",
    path: "/superadmin/reports/revenue",
    color: "bg-blue-600",
  },
  {
    icon: CalendarCheck2,
    title: "ລາຍງານສະຖິຕິການຈອງ",
    subtitle: "Booking Statistics — ຈຳນວນການຈອງ, ສະຖານະ ແລະ ຫ້ອງຍອດນິຍົມ",
    path: "/superadmin/reports/bookings",
    color: "bg-sky-500",
  },
  {
    icon: ClipboardList,
    title: "ລາຍງານການຈອງ",
    subtitle: "Booking List — bookings in selected range, filter &amp; export",
    path: "/superadmin/reports/booking-list",
    color: "bg-teal-500",
  },
  {
    icon: CreditCard,
    title: "ລາຍງານການຊຳລະ",
    subtitle: "Payments — ສະຖານະການຊຳລະເງິນທັງໝົດ",
    path: "/superadmin/reports/payments",
    color: "bg-cyan-600",
  },
  {
    icon: BedDouble,
    title: "ລາຍງານຫ້ອງພັກ",
    subtitle: "Rooms — ສະຖານະຫ້ອງ ແລະ ຫ້ອງທີ່ມີການຈອງຫຼາຍສຸດ",
    path: "/superadmin/reports/rooms",
    color: "bg-indigo-500",
  },
  {
    icon: Users,
    title: "ລາຍງານລູກຄ້າ",
    subtitle: "Customers — ເບີໂທ, ວັນສະໝັກ, ຈຳນວນຈອງ ແລະ ຍອດໃຊ້ຈ່າຍ",
    path: "/superadmin/reports/customers",
    color: "bg-blue-500",
  },
  {
    icon: Star,
    title: "ລາຍງານຣີວິວ",
    subtitle: "Reviews — ຄະແນນ, ຄຳຄິດເຫັນ ແລະ ການຕອບກັບ",
    path: "/superadmin/reports/reviews",
    color: "bg-sky-600",
  },
  {
    icon: Ban,
    title: "ລາຍງານການຍົກເລີກ",
    subtitle: "Cancellations — ເຫດຜົນ, ຍອດຄືນເງິນ ແລະ ບັນຊີຮັບເງິນ",
    path: "/superadmin/reports/cancellations",
    color: "bg-cyan-500",
  },
  {
    icon: LogIn,
    title: "ລາຍງານການເຂົ້າພັກ",
    subtitle: "Check-ins — ເອກະສານຢືນຢັນຕົວຕົນ ທີ່ເກັບຕອນ Check-in",
    path: "/superadmin/reports/checkins",
    color: "bg-indigo-600",
  },
  {
    icon: UserCog,
    title: "ລາຍງານພະນັກງານ",
    subtitle: "Staff — ຕຳແໜ່ງ, ບົດບາດ, ເງິນເດືອນ ແລະ ວັນເລີ່ມວຽກ",
    path: "/superadmin/reports/staff",
    color: "bg-blue-700",
  },
]

export default function SuperAdminReportsIndex() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // All-time org counts (not date-bound), so the launcher can show them directly.
  const [overview, setOverview] = useState<{ totalUsers: number; totalStaff: number } | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role !== "SUPERADMIN") router.push("/unauthorized")
  }, [status, session, router])

  useEffect(() => {
    if (status !== "authenticated") return
    let active = true
    fetch("/api/superadmin/reports")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (active && json?.summary) setOverview({ totalUsers: json.summary.totalUsers, totalStaff: json.summary.totalStaff }) })
      .catch(() => {})
    return () => { active = false }
  }, [status])

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-lao">
      <SuperAdminSidebar />
      <main className="ml-[210px] flex-1 p-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">ລາຍງານ</h1>
            <p className="text-[12px] text-gray-500 mt-1">ເລືອກລາຍງານທີ່ຕ້ອງການເບິ່ງ — ແຍກເປັນແຕ່ລະອັນຢ່າງຊັດເຈນ</p>
          </div>
          <div className="flex items-end gap-3">
          {overview && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm">
                <Users size={15} className="text-blue-500" />
                <span className="text-[12px] text-gray-500">ຜູ້ໃຊ້</span>
                <span className="text-[14px] font-bold text-gray-900">{overview.totalUsers.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm">
                <UserCog size={15} className="text-blue-500" />
                <span className="text-[12px] text-gray-500">ພະນັກງານ</span>
                <span className="text-[14px] font-bold text-gray-900">{overview.totalStaff.toLocaleString()}</span>
              </div>
            </div>
          )}
            <ProfileMenu />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map(({ icon: Icon, title, subtitle, path, color }) => (
            <Link key={path} href={path}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:border-blue-200 hover:shadow-md transition-all">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shrink-0`}>
                <Icon size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-gray-900">{title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
