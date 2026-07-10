"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { User, LogOut, ChevronDown } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

// Shared account menu for every Admin/SuperAdmin page top-right.
// Click → dropdown with Profile (edit at /profile) and Logout.
export function ProfileMenu() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const displayName = session?.user?.name ?? session?.user?.email ?? "Admin"
  const initial = (session?.user?.name ?? session?.user?.email ?? "A").charAt(0).toUpperCase()

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2.5 hover:bg-gray-50 transition-colors">
        <span className="w-7 h-7 rounded-full bg-[#0B2447] flex items-center justify-center text-white text-[12px] font-bold">{initial}</span>
        <span className="text-[12px] font-medium text-gray-700 max-w-[130px] truncate">{displayName}</span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[60]">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-[12px] font-semibold text-gray-800 truncate">{session?.user?.name ?? "—"}</p>
            <p className="text-[11px] text-gray-500 truncate">{session?.user?.email}</p>
          </div>
          <Link href="/profile" onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
            <User size={13} /> {t("navProfile")}
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-[12px] text-red-500 hover:bg-red-50 transition-colors">
            <LogOut size={13} /> {t("navLogout")}
          </button>
        </div>
      )}
    </div>
  )
}
