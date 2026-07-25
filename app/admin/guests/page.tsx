"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, Search, Users, AlertTriangle } from "lucide-react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { ProfileMenu } from "@/components/profile-menu"
import { TranslationKey, useLanguage } from "@/components/language-provider"

interface Guest {
  id: string
  name: string
  email: string
  phone: string
  joined: string
  bookings: number
  stays: number
  noShow: number
  cancelled: number
  spent: number
  lastStay: string | null
}

const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—")

export default function AdminGuestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()

  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [onlyRisk, setOnlyRisk] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated" && session?.user?.role === "USER") router.push("/unauthorized")
  }, [status, session, router])

  const fetchGuests = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/admin/guests")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setGuests(Array.isArray(data) ? data : [])
    } catch (err) {
      setGuests([]); setError(err instanceof Error ? err.message : "Failed to load")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const t = window.setTimeout(() => { void fetchGuests() }, 0)
    return () => window.clearTimeout(t)
  }, [status, fetchGuests])

  const filtered = guests
    .filter((g) => !onlyRisk || g.noShow > 0)
    .filter((g) => {
      if (!search) return true
      const text = `${g.name} ${g.email} ${g.phone}`.toLowerCase()
      return text.includes(search.toLowerCase())
    })

  const totalGuests = guests.length
  const riskGuests = guests.filter((g) => g.noShow > 0).length

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-lao">
      <AdminSidebar />

      <main className="flex-1 ml-[210px] p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-blue-600" /> {t("guests")}
            </h1>
            <p className="text-[12px] text-gray-500 mt-1">
              {t("guestsSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchGuests}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50">
              <RefreshCw size={13} /> {t("refresh")}
            </button>
            <ProfileMenu />
          </div>
        </div>

        {/* controls */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <button onClick={() => setOnlyRisk(false)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium
              ${!onlyRisk ? "bg-[#0B2447] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {t("all")} <span className="ml-1.5 opacity-60">({totalGuests})</span>
          </button>
          <button onClick={() => setOnlyRisk(true)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium inline-flex items-center gap-1.5
              ${onlyRisk ? "bg-[#0B2447] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <AlertTriangle size={12} /> {t("hasNoShow")} <span className="opacity-60">({riskGuests})</span>
          </button>
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchGuest")}
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 bg-white outline-none focus:border-blue-300 w-56" />
          </div>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50/60 text-left">
                  {(["guests", "contact", "joined", "bookings", "stays", "noShow", "cancelled", "totalSpent", "lastStay"] as TranslationKey[]).map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="py-16 text-center"><Loader2 size={24} className="text-blue-400 animate-spin inline" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-16 text-center text-gray-400 text-[13px]">{t("noGuestsFound")}</td></tr>
                ) : filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{g.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{g.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{g.email}</p>
                      <p className="text-[11px] text-gray-500">{g.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{d(g.joined)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{g.bookings}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{g.stays}</td>
                    <td className="px-4 py-3">
                      {g.noShow > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[11px] font-bold">
                          <AlertTriangle size={11} /> {g.noShow}
                        </span>
                      ) : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{g.cancelled}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{g.spent.toLocaleString()} ₭</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{d(g.lastStay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
