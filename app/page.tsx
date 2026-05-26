"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link  from "next/link"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
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
}

// ── helpers ──────────────────────────────────────────────────────
function getRoomCover(room: Room): string {
  if (room.images?.[0] && !room.images[0].includes("placeholder")) return room.images[0]
  if (room.imageUrl) return room.imageUrl
  return "/room.png"
}

export default function Home() {
  const router          = useRouter()
  const { data: session } = useSession()

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
      const url = q ? `/api/rooms?search=${encodeURIComponent(q)}` : "/api/rooms"
      const res = await fetch(url)
      if (!res.ok) throw new Error("fetch failed")
      const data: Room[] = await res.json()
      setRooms(data)
    } catch (err) {
      console.error("[HOME_FETCH_ROOMS]", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  // ── Search debounce ─────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => fetchRooms(search), 400)
    return () => clearTimeout(t)
  }, [search, fetchRooms])

  // ── Book button ─────────────────────────────────────────────
  function handleBook() {
    if (!session) { router.push("/login"); return }
    if (!selectedRoom || !checkIn || !checkOut) {
      alert("ກະລຸນາເລືອກຫ້ອງ ແລະ ວັນທີໃຫ້ຄົບ"); return
    }
    const room = rooms.find((r) => r.id === selectedRoom)
    if (!room) return
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
          <p className="font-bold text-base tracking-wide drop-shadow">Resort MDNK1</p>

          {session ? (
            /* ถ้า login แล้ว → แสดงชื่อ + dropdown */
            <div className="relative group">
              <button className="bg-white/10 hover:bg-white/20 backdrop-blur px-4 py-1.5 rounded-lg flex items-center gap-2 text-[12px] border border-white/20 transition-all">
                <User size={13} />
                {session.user.name ?? session.user.email}
                <ChevronDown size={11} />
              </button>
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                  <User size={12} /> ໂປຣໄຟລ໌
                </Link>
                <Link href="/history" className="flex items-center gap-2 px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                  <Bed size={12} /> ປະຫວັດການຈອງ
                </Link>
                {(session.user.role === "ADMIN" || session.user.role === "SUPERADMIN") && (
                  <>
                    <div className="h-px bg-gray-100 mx-3 my-1" />
                    <Link href="/admin/dashboard" className="flex items-center gap-2 px-4 py-2 text-[12px] text-purple-600 hover:bg-purple-50">
                      <Star size={12} /> Admin Panel
                    </Link>
                  </>
                )}
                <div className="h-px bg-gray-100 mx-3 my-1" />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 w-full px-4 py-2 text-[12px] text-red-500 hover:bg-red-50"
                >
                  <LogOut size={12} /> ອອກຈາກລະບົບ
                </button>
              </div>
            </div>
          ) : (
            /* ยังไม่ login → Sign In */
            <div className="relative group">
              <button className="bg-slate-900/80 hover:bg-slate-800 px-4 py-1.5 rounded-lg flex items-center gap-2 text-[12px] border border-white/20 transition-all">
                Sign In <User size={12} />
              </button>
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link href="/login"    className="block px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium">Login</Link>
                <div className="h-px bg-gray-100 mx-2 my-1" />
                <Link href="/register" className="block px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium">Sign Up</Link>
              </div>
            </div>
          )}
        </nav>

        {/* Headline */}
        <div className="relative z-20 container mx-auto px-8 mt-6">
          <p className="text-[13px] text-white/70 mb-2 uppercase tracking-widest">Welcome to</p>
          <h1 className="text-4xl font-bold leading-tight drop-shadow-lg">
            Resort Mai Son De <br /> Nong Khiw
          </h1>
        </div>

        {/* ── Search Bar ──────────────────────────────────────── */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-4">
          <div className="bg-white rounded-xl shadow-lg p-3 flex flex-wrap items-end gap-3 text-gray-700 border border-gray-100">

            {/* เลือกห้อง */}
            <div className="flex-1 min-w-[140px]">
              <p className="text-[9px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">ຈອງຫ້ອງ</p>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full border-b border-gray-200 py-1 text-[12px] bg-transparent outline-none cursor-pointer text-gray-700"
              >
                <option value="">ເລືອກຫ້ອງ</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.price.toLocaleString()} ₭
                  </option>
                ))}
              </select>
            </div>

            {/* Check-in */}
            <div className="flex-1 min-w-[110px]">
              <p className="text-[9px] text-gray-400 mb-1 uppercase tracking-wider">ວັນທີເຂົ້າພັກ</p>
              <input
                type="date" min={today} value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full border-b border-gray-200 py-1 text-[12px] outline-none"
              />
            </div>

            {/* Check-out */}
            <div className="flex-1 min-w-[110px]">
              <p className="text-[9px] text-gray-400 mb-1 uppercase tracking-wider">ວັນທີເຊັກເອົາ</p>
              <input
                type="date" min={checkIn || today} value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border-b border-gray-200 py-1 text-[12px] outline-none"
              />
            </div>

            {/* ปุ่มจอง */}
            <button
              onClick={handleBook}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2 rounded-lg text-[12px] font-semibold transition-all"
            >
              ຈອງຫ້ອງ
            </button>

            {/* Search */}
            <div className="relative flex-1 min-w-[130px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                type="text" placeholder="ຄົ້ນຫາ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2 pl-7 pr-3 border border-gray-200 rounded-lg bg-gray-50 text-[12px] outline-none focus:border-blue-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Room List ───────────────────────────────────────────── */}
      <section className="container mx-auto px-6 pt-20 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-blue-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900">ຫ້ອງພັກ</h2>
          {!loading && (
            <span className="text-[11px] text-gray-400 ml-1">
              ({rooms.length} ຫ້ອງ)
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
          <div className="text-center py-20 text-gray-400">
            <Bed size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[14px]">ບໍ່ພົບຫ້ອງທີ່ຄົ້ນຫາ</p>
          </div>
        )}

        {/* Room cards */}
        {!loading && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
              >
                {/* Image */}
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={getRoomCover(room)}
                    alt={room.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/room.png" }}
                  />
                  {room.featured && (
                    <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      ⭐ Featured
                    </span>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[11px] font-bold text-blue-700">
                    {room.price.toLocaleString()} ₭
                  </div>
                </div>

                {/* Body */}
                <div className="p-4">
                  <h3 className="text-[13px] font-bold text-gray-900 truncate">{room.name}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{room.view}</p>

                  {/* Info row */}
                  <div className="flex items-center gap-3 mt-2.5 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Bed   size={11} /> {room.bedType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {room.capacity} ຄົນ
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye  size={11} /> {room.size} m²
                    </span>
                  </div>

                  {/* Amenities pills (max 3) */}
                  {room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {room.amenities.slice(0, 3).map((a) => (
                        <span key={a} className="flex items-center gap-0.5 text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                          {a.toLowerCase().includes("wifi") ? <Wifi size={8} /> : <Wind size={8} />}
                          {a}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-[9px] text-gray-400 px-1.5 py-0.5">
                          +{room.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => {
                      setSelectedRoom(room.id)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className="w-full mt-3.5 py-2 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all active:scale-95"
                  >
                    ເລືອກຫ້ອງນີ້
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}