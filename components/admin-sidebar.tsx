"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, LayoutGrid,
  CalendarDays, Star, LogOut,
} from "lucide-react"

// Single source of truth for the Admin navigation.
// Admin = operations staff (พนักงาน): manage room STATUS, bookings and reviews.
// Room CRUD/pricing (/booking) and staff management live elsewhere, so they
// are intentionally absent. Admin only manages room *status* via /admin/room-status.
// Labels are kept identical on every page so they never change when navigating.
const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",       path: "/admin/dashboard"   },
  { icon: LayoutGrid,      label: "Room Status",      path: "/admin/room-status" },
  { icon: CalendarDays,    label: "ຈັດການການຈອງ",    path: "/schedule"          },
  { icon: Star,            label: "ຈັດການລີວິວ",      path: "/review"            },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[210px] min-h-screen bg-[#1E1040] flex flex-col justify-between fixed left-0 top-0 z-40">
      <div>
        <div className="px-6 py-5 border-b border-white/10">
          <p className="text-white/50 text-[10px] uppercase tracking-wider">Admin Panel</p>
          <p className="text-white font-bold text-[14px] mt-0.5">Resort MDNK1</p>
        </div>
        <nav className="mt-3 px-3 space-y-0.5">
          {NAV.map(({ icon: Icon, label, path }) => {
            const active = pathname === path || pathname.startsWith(`${path}/`)
            return (
              <Link key={path} href={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all
                  ${active
                    ? "bg-white/10 text-white border-l-[3px] border-pink-400"
                    : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                <Icon size={15} className="shrink-0" /> {label}
              </Link>
            )
          })}
        </nav>
      </div>
      <button onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 px-6 py-5 text-white/50 hover:text-white text-[12px] transition-colors border-t border-white/10">
        <LogOut size={14} /> ອອກຈາກລະບົບ
      </button>
    </aside>
  )
}
