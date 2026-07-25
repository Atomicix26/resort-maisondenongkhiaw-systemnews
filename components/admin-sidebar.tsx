"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, LayoutGrid,
  CalendarDays, DoorOpen, Ban, Users, Star, LogOut,
} from "lucide-react"
import { TranslationKey, useLanguage } from "@/components/language-provider"

const RESORT_NAME = "Resort Maison De Nongkhiaw"

// Single source of truth for the Admin navigation.
// Admin = operations staff (พนักงาน): the day-to-day front-desk workflow —
// room STATUS, bookings, check-in/out, cancellations/refunds, guests, reviews.
// Owner-only zones (staff, prices, reports, users) live in the SuperAdmin
// sidebar and are intentionally absent here.
// Labels are kept identical on every page so they never change when navigating.
const NAV = [
  { icon: LayoutDashboard, labelKey: "dashboard",             path: "/admin/dashboard"     },
  { icon: LayoutGrid,      labelKey: "roomStatus",            path: "/admin/room-status"   },
  { icon: CalendarDays,    labelKey: "bookingManagement",     path: "/schedule"            },
  { icon: DoorOpen,        labelKey: "checkInOut",            path: "/admin/check-in"      },
  { icon: Ban,             labelKey: "cancellationsRefunds",  path: "/admin/cancellations" },
  { icon: Users,           labelKey: "guests",                path: "/admin/guests"        },
  { icon: Star,            labelKey: "reviewsManagement",     path: "/review"              },
] satisfies { icon: React.ElementType; labelKey: TranslationKey; path: string }[]

export function AdminSidebar() {
  const pathname = usePathname() ?? ""
  const { t } = useLanguage()

  return (
    <aside className="w-[210px] min-h-screen bg-[#0B2447] flex flex-col justify-between fixed left-0 top-0 z-40">
      <div>
        <div className="px-6 py-5 border-b border-white/10">
          <p className="text-white/60 text-[11px] uppercase tracking-wider">{t("adminPanel")}</p>
          <p className="text-white font-bold text-[14px] mt-0.5 leading-snug">{RESORT_NAME}</p>
        </div>
        <nav className="mt-3 px-3 space-y-0.5">
          {NAV.map(({ icon: Icon, labelKey, path }) => {
            const active = pathname === path || pathname.startsWith(`${path}/`)
            return (
              <Link key={path} href={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all
                  ${active
                    ? "bg-white/10 text-white border-l-[3px] border-sky-400"
                    : "text-white/70 hover:text-white hover:bg-white/5"}`}>
                <Icon size={15} className="shrink-0" /> {t(labelKey)}
              </Link>
            )
          })}
        </nav>
      </div>
      <button onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 px-6 py-5 text-white/60 hover:text-white text-[12px] transition-colors border-t border-white/10">
        <LogOut size={14} /> {t("navLogout")}
      </button>
    </aside>
  )
}
