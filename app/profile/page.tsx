"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link  from "next/link"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  User, LogOut, Bed, Search, Wifi, Wind,
  Users, Eye, Pencil, X, CheckCircle2, Star,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────
interface UserProfile {
  id:        string
  name:      string | null
  lastName:  string | null
  email:     string
  phone:     string | null
  role:      string
  createdAt: string
}

interface Room {
  id:        string
  name:      string
  price:     number
  capacity:  number
  size:      number
  bedType:   string
  view:      string | null
  images:    string[]
  amenities: string[]
  featured:  boolean
}

function getRoomCover(room: Room): string {
  if (room.images?.[0] && !room.images[0].includes("placeholder")) return room.images[0]
  return "/room.png"
}

// ── Edit Profile Modal ───────────────────────────────────────────
function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: UserProfile
  onClose: () => void
  onSaved: (updated: UserProfile) => void
}) {
  const [name,     setName]     = useState(profile.name     ?? "")
  const [lastName, setLastName] = useState(profile.lastName ?? "")
  const [phone,    setPhone]    = useState(profile.phone    ?? "")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [success,  setSuccess]  = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name || !lastName) { setError("ກະລຸນາກອກຊື່ ແລະ ນາມສະກຸນ"); return }

    setLoading(true)
    try {
      const res  = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, lastName, phone }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? "ບໍ່ສຳເລັດ"); return }
      setSuccess(true)
      setTimeout(() => { onSaved({ ...profile, name, lastName, phone }); onClose() }, 800)
    } catch {
      setError("ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-lao">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700">
          <X size={18} />
        </button>

        <h2 className="text-[17px] font-bold text-gray-900 mb-6">ແກ້ໄຂຂໍ້ມູນສ່ວນຕົວ</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[12px] text-gray-600 font-semibold">ຊື່</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2.5 text-[14px] text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300"
              placeholder="ກອກຊື່..." />
          </div>
          <div>
            <label className="text-[12px] text-gray-600 font-semibold">ນາມສະກຸນ</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2.5 text-[14px] text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300"
              placeholder="ກອກນາມສະກຸນ..." />
          </div>
          <div>
            <label className="text-[12px] text-gray-600 font-semibold">ເບີໂທ</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2.5 text-[14px] text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300"
              placeholder="020xxxxxxxx" />
          </div>

          {error   && <p className="text-red-500 text-[12px]">{error}</p>}
          {success && (
            <p className="flex items-center gap-1.5 text-green-600 text-[12px]">
              <CheckCircle2 size={14} /> ບັນທຶກສຳເລັດ
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 transition-all">
              ຍົກເລີກ
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50">
              {loading ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export default function ProfilePage() {
  const router                    = useRouter()
  const { data: session, status } = useSession()

  const [profile,      setProfile]      = useState<UserProfile | null>(null)
  const [rooms,        setRooms]        = useState<Room[]>([])
  const [loadProfile,  setLoadProfile]  = useState(true)
  const [loadRooms,    setLoadRooms]    = useState(true)
  const [search,       setSearch]       = useState("")
  const [editOpen,     setEditOpen]     = useState(false)
  const [checkIn,      setCheckIn]      = useState("")
  const [checkOut,     setCheckOut]     = useState("")
  const [selectedRoom, setSelectedRoom] = useState("")

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status !== "authenticated")  return
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(console.error)
      .finally(() => setLoadProfile(false))
  }, [status, router])

  const fetchRooms = useCallback(async (q = "") => {
    setLoadRooms(true)
    try {
      const url = q ? `/api/rooms?search=${encodeURIComponent(q)}` : "/api/rooms"
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) { setRooms([]); return }
      setRooms(data)
    } catch {
      setRooms([])
    } finally {
      setLoadRooms(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchRooms() }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchRooms])
  useEffect(() => {
    const t = setTimeout(() => fetchRooms(search), 400)
    return () => clearTimeout(t)
  }, [search, fetchRooms])

  function handleBook() {
    if (!selectedRoom || !checkIn || !checkOut) {
      alert("ກະລຸນາເລືອກຫ້ອງ ແລະ ວັນທີໃຫ້ຄົບ"); return
    }
    router.push(`/payment?roomId=${selectedRoom}&checkIn=${checkIn}&checkOut=${checkOut}`)
  }

  if (status === "loading" || loadProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-lao">
        <p className="text-gray-400 text-[13px] animate-pulse">ກຳລັງໂຫລດ...</p>
      </div>
    )
  }

  const displayName = profile?.name
    ? `${profile.name} ${profile.lastName ?? ""}`.trim()
    : session?.user?.email ?? "User"

  const roleColor =
    profile?.role === "SUPERADMIN" ? "bg-purple-500/80" :
    profile?.role === "ADMIN"      ? "bg-emerald-500/80" :
                                     "bg-blue-500/80"

  return (
    <main className="min-h-screen bg-gray-50 font-lao overflow-x-hidden">

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative h-[420px] w-full text-white">
        <div className="absolute inset-0 z-0">
          <Image src="/pic.png" alt="Resort" fill className="object-cover" priority sizes="100vw" />
          {/* gradient: dark top + dark bottom, clear middle */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/55" />
        </div>

        {/* ── Navbar: Resort name (prominent) + logout only ── */}
        <nav className="relative z-20 flex justify-between items-center px-8 py-5 container mx-auto">
          {/* Resort branding */}
          <Link href="/" className="flex flex-col leading-none group">
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-[0.2em] mb-0.5 drop-shadow">
              ຍິນດີຕ້ອນຮັບສູ່
            </span>
            <span className="text-[24px] font-extrabold tracking-wide drop-shadow-lg group-hover:text-white/90 transition-colors">
              Resort MDNK1
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {(session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN") && (
              <Link href="/admin/dashboard"
                className="bg-purple-500/70 hover:bg-purple-600/80 backdrop-blur-sm px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-[12px] border border-white/20 transition-all">
                <Star size={12} /> Admin Panel
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-red-500/80 hover:bg-red-600 px-4 py-1.5 rounded-lg flex items-center gap-2 text-[12px] border border-white/20 transition-all active:scale-95">
              <LogOut size={13} /> ອອກ
            </button>
          </div>
        </nav>

        {/* ── Profile — single display ── */}
        <div className="relative z-20 container mx-auto px-8 mt-5">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-[72px] h-[72px] rounded-2xl bg-white/15 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-xl flex-shrink-0">
              <User size={34} className="text-white/90" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white/55 text-[9.5px] uppercase tracking-[0.18em] mb-1">ໂປຣໄຟລ໌ສ່ວນຕົວ</p>
              <h1 className="text-[26px] font-extrabold drop-shadow-lg leading-none truncate">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2">
                <span className="text-white text-[13px] font-medium drop-shadow">{profile?.email}</span>
                {profile?.phone && (
                  <>
                    <span className="text-white/50">·</span>
                    <span className="text-white/90 text-[13px] font-medium drop-shadow">{profile.phone}</span>
                  </>
                )}
                <span className={`${roleColor} backdrop-blur text-white text-[10px] font-bold px-3 py-0.5 rounded-full tracking-widest uppercase shadow`}>
                  {profile?.role}
                </span>
              </div>
            </div>

            {/* Edit */}
            <button
              onClick={() => setEditOpen(true)}
              className="flex-shrink-0 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/25 text-white text-[12px] px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg">
              <Pencil size={13} /> ແກ້ໄຂຂໍ້ມູນ
            </button>
          </div>
        </div>

        {/* ── Search / Booking Bar ── */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-30 w-full max-w-5xl px-4">
          <div className="bg-white rounded-xl shadow-lg p-3 flex flex-wrap items-end gap-3 text-gray-700 border border-gray-100">

            <div className="flex-1 min-w-[140px]">
              <p className="text-[9px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">ຈອງຫ້ອງ</p>
              <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full border-b border-gray-200 py-1 text-[12px] bg-transparent outline-none text-gray-700">
                <option value="">ເລືອກຫ້ອງ</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {r.price.toLocaleString()} ₭</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[110px]">
              <p className="text-[9px] text-gray-400 mb-1 uppercase tracking-wider">ວັນທີເຂົ້າພັກ</p>
              <input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                className="w-full border-b border-gray-200 py-1 text-[12px] outline-none" />
            </div>

            <div className="flex-1 min-w-[110px]">
              <p className="text-[9px] text-gray-400 mb-1 uppercase tracking-wider">ວັນທີເຊັກເອົາ</p>
              <input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border-b border-gray-200 py-1 text-[12px] outline-none" />
            </div>

            <button onClick={handleBook}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2 rounded-lg text-[12px] font-semibold transition-all">
              ຈອງຫ້ອງ
            </button>

            <Link href="/history"
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-2 rounded-lg text-[12px] font-semibold transition-all">
              ປະຫວັດການຈອງ
            </Link>

            <div className="relative flex-1 min-w-[130px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input type="text" placeholder="ຄົ້ນຫາ..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2 pl-7 pr-3 border border-gray-200 rounded-lg bg-gray-50 text-[12px] outline-none focus:border-blue-300" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Room List ─────────────────────────────────────────── */}
      <section className="container mx-auto px-6 pt-20 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-blue-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900">ຫ້ອງພັກ</h2>
          {!loadRooms && (
            <span className="text-[11px] text-gray-400">({rooms.length} ຫ້ອງ)</span>
          )}
        </div>

        {/* Skeleton */}
        {loadRooms && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-5 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No result */}
        {!loadRooms && rooms.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Bed size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[14px]">ບໍ່ພົບຫ້ອງທີ່ຄົ້ນຫາ</p>
          </div>
        )}

        {/* Cards */}
        {!loadRooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {rooms.map((room) => (
              <div key={room.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group">
                <div className="relative h-48 w-full overflow-hidden">
                  <Image src={getRoomCover(room)} alt={room.name} fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/room.png" }} />
                  {room.featured && (
                    <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      ⭐ Featured
                    </span>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[11px] font-bold text-blue-700">
                    {room.price.toLocaleString()} ₭
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-[14px] font-bold text-gray-900 truncate">{room.name}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{room.view}</p>

                  <div className="flex items-center gap-3 mt-2.5 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><Bed   size={11} /> {room.bedType}</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {room.capacity} ຄົນ</span>
                    <span className="flex items-center gap-1"><Eye   size={11} /> {room.size} m²</span>
                  </div>

                  {room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {room.amenities.slice(0, 3).map((a) => (
                        <span key={a} className="flex items-center gap-0.5 text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                          {a.toLowerCase().includes("wifi") ? <Wifi size={8} /> : <Wind size={8} />}
                          {a}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-[9px] text-gray-400 px-1">+{room.amenities.length - 3}</span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedRoom(room.id)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className="w-full mt-4 py-2 border-2 border-gray-800 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-gray-800 hover:text-white transition-all active:scale-95">
                    ເລືອກຫ້ອງນີ້
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Edit Modal ───────────────────────────────────────── */}
      {editOpen && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setProfile(updated)}
        />
      )}
    </main>
  )
}
