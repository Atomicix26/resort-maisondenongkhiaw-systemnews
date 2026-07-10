"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Activity, Users, UserCog, BedDouble, Layers, TrendingUp,
  FileBarChart, Clock, Crown, LogOut,
} from "lucide-react"

// Single source of truth for the SuperAdmin navigation.
// SuperAdmin = owner's representative: manage staff and ALL room data
// (rooms, room types, prices) and view reports. It does NOT handle the
// booking workflow or reviews (those belong to the Admin zone).
const NAV = [
  { icon: Activity,     label: "Dashboard",    path: "/superadmin/dashboard"  },
  { icon: UserCog,      label: "Users",        path: "/superadmin/users"      },
  { icon: Users,        label: "Staff",        path: "/superadmin/staff"      },
  { icon: BedDouble,    label: "Rooms",        path: "/booking"               },
  { icon: Layers,       label: "Room Type",    path: "/superadmin/room-types" },
  { icon: TrendingUp,   label: "Price Config", path: "/superadmin/price-config" },
  { icon: FileBarChart, label: "Reports",      path: "/superadmin/reports"    },
  { icon: Clock,        label: "Access Logs",  path: "/superadmin/logs"       },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[210px] min-h-screen bg-[#071A33] flex flex-col justify-between fixed left-0 top-0 z-40">
      <div>
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2 mb-0.5">
            <Crown size={14} className="text-amber-400" />
            <p className="text-white/60 text-[11px] uppercase tracking-wider">SuperAdmin</p>
          </div>
          <p className="text-white font-bold text-[14px]">Resort MDNK1</p>
        </div>
        <nav className="mt-3 px-3 space-y-0.5">
          {NAV.map(({ icon: Icon, label, path }) => {
            const active = pathname === path || pathname.startsWith(`${path}/`)
            return (
              <Link key={path} href={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all
                  ${active
                    ? "bg-white/10 text-white border-l-[3px] border-amber-400"
                    : "text-white/70 hover:text-white hover:bg-white/5"}`}>
                <Icon size={15} className="shrink-0" /> {label}
              </Link>
            )
          })}
        </nav>
      </div>
      <button onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 px-6 py-5 text-white/60 hover:text-white text-[12px] transition-colors border-t border-white/10">
        <LogOut size={14} /> ອອກຈາກລະບົບ
      </button>
    </aside>
  )
}
