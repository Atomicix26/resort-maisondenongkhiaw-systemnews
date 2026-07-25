"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link  from "next/link"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useLanguage } from "@/components/language-provider"
import { RoomSelect } from "@/components/room-select"
import { getRedirectByRole } from "@/lib/routes"
import {
  Search, Bed, Users, Eye, LogOut,
  User, ChevronDown, Wifi, Wind, Star,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────
interface Room {
  id:          string
  name:        string
  description: string
  price:       number
  capacity:    number
  size:        number
  bedType:     string
  view:        string | null
  images:      string[]
  amenities:   string[]
  featured:    boolean
  imageUrl:    string | null
  status:      "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED"
  available:   boolean
  unavailableReason: string | null
}

// ── helpers ──────────────────────────────────────────────────────
function getRoomCover(room: Room): string {
  if (room.images?.[0] && !room.images[0].includes("placeholder")) return room.images[0]
  if (room.imageUrl) return room.imageUrl
  return "/room.png"
}

function roomUnavailableText(room: Room) {
  if (room.available) return ""
  return room.unavailableReason ?? "ບໍ່ພ້ອມໃຊ້ງານ"
}

export default function Home() {
  const router          = useRouter()
  const { data: session } = useSession()
  const { t } = useLanguage()

  const [rooms,        setRooms]        = useState<Room[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState("")
  const [selectedRoom, setSelectedRoom] = useState("")
  const [checkIn,      setCheckIn]      = useState("")
  const [checkOut,     setCheckOut]     = useState("")

  // ── Fetch rooms ─────────────────────────────────────────────
  const fetchRooms = useCallback(async (q = "") => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set("search", q)
      if (checkIn && checkOut) {
        params.set("checkIn", checkIn)
        params.set("checkOut", checkOut)
      }
      const res = await fetch(`/api/rooms${params.size ? `?${params}` : ""}`)
      if (!res.ok) throw new Error("fetch failed")
      const data: Room[] = await res.json()
      setRooms(data)
    } catch (err) {
      console.error("[HOME_FETCH_ROOMS]", err)
    } finally {
      setLoading(false)
    }
  }, [checkIn, checkOut])

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchRooms() }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchRooms])

  // ── Search debounce ─────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => fetchRooms(search), 400)
    return () => clearTimeout(t)
  }, [search, fetchRooms])

  // ── Book button ─────────────────────────────────────────────
  function handleBook() {
    if (!session) { router.push("/login"); return }
    if (!selectedRoom || !checkIn || !checkOut) {
      alert(t("validationMissingBookingInfo")); return
    }
    const room = rooms.find((r) => r.id === selectedRoom)
    if (!room) return
    if (!room.available) {
      alert(roomUnavailableText(room)); return
    }
    router.push(
      `/payment?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}`
    )
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <main className="min-h-screen bg-gray-50 font-lao">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative h-[420px] w-full text-white">
        <div className="absolute inset-0 z-0">
          <Image src="/pic.png" alt="Resort" fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* ── Navbar ──────────────────────────────────────────── */}
        <nav className="relative z-50 flex justify-between items-center px-8 py-4 container mx-auto">
          <p className="font-bold text-base tracking-wide drop-shadow"></p>

          {session?.user ? (
            /* ถ้า login แล้ว → แสดงชื่อ + dropdown */
            <div className="relative group">
              <button className="bg-white/10 hover:bg-white/20 backdrop-blur px-4 py-1.5 rounded-lg flex items-center gap-2 text-[12px] border border-white/20 transition-all">
                <User size={13} />
                {session.user.name ?? session.user.email}
                <ChevronDown size={11} />
              </button>
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                  <User size={12} /> {t("navProfile")}
                </Link>
                <Link href="/history" className="flex items-center gap-2 px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                  <Bed size={12} /> {t("navHistory")}
                </Link>
                {(session.user.role === "ADMIN" || session.user.role === "SUPERADMIN") && (
                  <>
                    <div className="h-px bg-gray-100 mx-3 my-1" />
                    <Link href={getRedirectByRole(session.user.role)} className="flex items-center gap-2 px-4 py-2 text-[12px] text-blue-600 hover:bg-blue-50">
                      <Star size={12} /> {t("adminPanel")}
                    </Link>
                  </>
                )}
                <div className="h-px bg-gray-100 mx-3 my-1" />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 w-full px-4 py-2 text-[12px] text-red-500 hover:bg-red-50"
                >
                  <LogOut size={12} /> {t("navLogout")}
                </button>
              </div>
            </div>
          ) : (
            /* ยังไม่ login → Sign In */
            <div className="relative group">
              <button className="bg-slate-900/80 hover:bg-slate-800 px-4 py-1.5 rounded-lg flex items-center gap-2 text-[12px] border border-white/20 transition-all">
                {t("navSignIn")} <User size={12} />
              </button>
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link href="/login"    className="block px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium">{t("navLogin")}</Link>
                <div className="h-px bg-gray-100 mx-2 my-1" />
                <Link href="/register" className="block px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium">{t("navSignUp")}</Link>
              </div>
            </div>
          )}
        </nav>

        {/* Headline */}
        <div className="relative z-20 container mx-auto px-8 mt-6 text-center">
          <p className="flex items-center justify-center gap-4 text-white/120 mb-5 uppercase tracking-[0.5em] font-light text-[24px] md:text-xs">
            <span className="h-px w-12 md:w-16 bg-white/40" />
            {t("heroKicker")}
            <span className="h-px w-12 md:w-16 bg-white/40" />
          </p>
          <h1   className="text-5xl sm:text-6xl lg:text-8xl font-serif font-light leading-tight tracking-tight"
              style={{ 
                backgroundImage: 'linear-gradient(135deg, #fff 0%, #f0e5d8 50%, #e8d4b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 8px 32px rgba(0,0,0,0.3)',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))'
              }}
            >
            Resort Maison De Nongkhiaw
          </h1>
        </div>

        {/* ── Search Bar ──────────────────────────────────────── */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 flex flex-wrap items-end gap-4 border border-gray-100">

            {/* เลือกห้อง */}
            <div className="flex-[1.5] min-w-[170px]">
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">{t("bookingLabel")}</p>
              <RoomSelect rooms={rooms} value={selectedRoom} onChange={setSelectedRoom} placeholder={t("selectRoom")} />
            </div>

            {/* Check-in */}
            <div className="flex-1 min-w-[120px]">
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">{t("checkIn")}</p>
              <input
                type="date" min={today} value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value)
                  if (checkOut && e.target.value >= checkOut) setCheckOut("")
                }}
                className="w-full border-b border-gray-300 pb-1.5 text-[13px] text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            {/* Check-out */}
            <div className="flex-1 min-w-[120px]">
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">{t("checkOut")}</p>
              <input
                type="date" min={checkIn || today} value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border-b border-gray-300 pb-1.5 text-[13px] text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            {/* ปุ่มจอง */}
            <button
              onClick={handleBook}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-all shadow-sm"
            >
              {t("bookNow")}
            </button>

            {/* Search */}
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
              <input
                type="text" placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2.5 pl-8 pr-3 border border-gray-300 rounded-lg bg-white text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Room List ───────────────────────────────────────────── */}
      <section className="container mx-auto px-6 pt-20 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-blue-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900">{t("roomsTitle")}</h2>
          {!loading && (
            <span className="text-[11px] text-gray-500 ml-1">
              ({rooms.length} {t("roomsCountSuffix")})
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && rooms.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Bed size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[14px]">{t("noRooms")}</p>
          </div>
        )}

        {/* Room cards */}
        {!loading && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {rooms.map((room) => {
              const blocked = !room.available
              return (
              <div
                key={room.id}
                className={`bg-white rounded-xl border overflow-hidden transition-all duration-200 group ${blocked ? "border-gray-200 opacity-70" : "border-gray-100 hover:shadow-lg hover:-translate-y-1"}`}
              >
                {/* Image */}
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={getRoomCover(room)}
                    alt={room.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className={`object-cover transition-transform duration-300 ${blocked ? "grayscale" : "group-hover:scale-105"}`}
                    onError={(e) => { (e.target as HTMLImageElement).src = "/room.png" }}
                  />
                  {room.featured && (
                    <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {t("featured")}
                    </span>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[11px] font-bold text-blue-700">
                    {room.price.toLocaleString()} ₭
                  </div>
                  {blocked && (
                    <div className="absolute inset-x-0 bottom-0 bg-gray-950/75 px-3 py-2 text-[12px] font-bold text-white">
                      {roomUnavailableText(room)}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4">
                  <h3 className="text-[13px] font-bold text-gray-900 truncate">{room.name}</h3>
                  <p className="text-[12px] text-gray-500 mt-0.5 truncate">{room.view}</p>

                  {/* Info row */}
                  <div className="flex items-center gap-3.5 mt-2.5 text-[12px] font-medium text-gray-600">
                    <span className="flex items-center gap-1">
                      <Bed   size={13} className="text-gray-500" /> {room.bedType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} className="text-gray-500" /> {room.capacity} {t("people")}
                    </span>
                    {room.size != null && (
                      <span className="flex items-center gap-1">
                        <Eye  size={13} className="text-gray-500" /> {room.size} m²
                      </span>
                    )}
                  </div>

                  {/* Amenities pills (max 3) */}
                  {room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {room.amenities.slice(0, 3).map((a) => (
                        <span key={a} className="flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {a.toLowerCase().includes("wifi") ? <Wifi size={10} /> : <Wind size={10} />}
                          {a}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-[11px] font-medium text-gray-500 px-1.5 py-0.5">
                          +{room.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    disabled={blocked}
                    onClick={() => {
                      if (blocked) return
                      setSelectedRoom(room.id)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className={`w-full mt-4 py-2.5 border-2 rounded-lg text-[12px] font-bold transition-all active:scale-95 ${blocked ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400" : "border-gray-800 text-gray-800 hover:bg-gray-900 hover:text-white hover:border-gray-900"}`}
                  >
                    {blocked ? roomUnavailableText(room) : t("chooseThisRoom")}
                  </button>
                </div>
              </div>
            )})}
          </div>
        )}
      </section>
    </main>
  )
}
