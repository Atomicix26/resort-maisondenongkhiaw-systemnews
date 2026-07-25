"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link  from "next/link"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { RoomSelect } from "@/components/room-select"
import { getRedirectByRole } from "@/lib/routes"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SuperAdminSidebar } from "@/components/superadmin-sidebar"
import { ProfileMenu } from "@/components/profile-menu"
import { useLanguage } from "@/components/language-provider"
import {
  User, LogOut, Bed, Search, Wifi, Wind,
  Users, Eye, Pencil, X, CheckCircle2, Star,
  Settings, LayoutDashboard,
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
  status:    "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED"
  available: boolean
  unavailableReason: string | null
}

function getRoomCover(room: Room): string {
  if (room.images?.[0] && !room.images[0].includes("placeholder")) return room.images[0]
  return "/room.png"
}

function roomUnavailableText(room: Room) {
  if (room.available) return ""
  return room.unavailableReason ?? "ບໍ່ພ້ອມໃຊ້ງານ"
}

// Read-only field row for the staff account-settings view.
function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-[13px] text-gray-800 mt-0.5 ${mono ? "font-mono" : "font-medium"}`}>{value || "—"}</p>
    </div>
  )
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
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-gray-700">
          <X size={18} />
        </button>

        <h2 className="text-[17px] font-bold text-gray-900 mb-6">ແກ້ໄຂຂໍ້ມູນສ່ວນຕົວ</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[12px] text-gray-600 font-semibold">ຊື່</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2.5 text-[14px] text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
              placeholder="ກອກຊື່..." />
          </div>
          <div>
            <label className="text-[12px] text-gray-600 font-semibold">ນາມສະກຸນ</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2.5 text-[14px] text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
              placeholder="ກອກນາມສະກຸນ..." />
          </div>
          <div>
            <label className="text-[12px] text-gray-600 font-semibold">ເບີໂທ</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2.5 text-[14px] text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
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
  const { t } = useLanguage()

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
      const params = new URLSearchParams()
      if (q) params.set("search", q)
      if (checkIn && checkOut) {
        params.set("checkIn", checkIn)
        params.set("checkOut", checkOut)
      }
      const res = await fetch(`/api/rooms${params.size ? `?${params}` : ""}`)
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) { setRooms([]); return }
      setRooms(data)
    } catch {
      setRooms([])
    } finally {
      setLoadRooms(false)
    }
  }, [checkIn, checkOut])

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
    const room = rooms.find((r) => r.id === selectedRoom)
    if (!room) return
    if (!room.available) {
      alert(roomUnavailableText(room)); return
    }
    router.push(`/payment?roomId=${selectedRoom}&checkIn=${checkIn}&checkOut=${checkOut}`)
  }

  if (status === "loading" || loadProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-lao">
        <p className="text-gray-500 text-[13px] animate-pulse">ກຳລັງໂຫລດ...</p>
      </div>
    )
  }

  const displayName = profile?.name
    ? `${profile.name} ${profile.lastName ?? ""}`.trim()
    : session?.user?.email ?? "User"

  // ── Staff (ADMIN/SUPERADMIN): clean "Account Settings" page with the
  //    dashboard sidebar — not the customer booking/room-browsing view. ──
  if (profile?.role === "ADMIN" || profile?.role === "SUPERADMIN") {
    const Sidebar = profile.role === "SUPERADMIN" ? SuperAdminSidebar : AdminSidebar
    const joined = profile.createdAt
      ? new Date(profile.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
      : "—"
    return (
      <div className="min-h-screen bg-gray-50 flex font-lao">
        <Sidebar />
        <main className="flex-1 ml-[210px] p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[20px] font-bold text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" /> {t("accountSettings")}
              </h1>
              <p className="text-[12px] text-gray-500 mt-1">{t("accountDetails")}</p>
            </div>
            <ProfileMenu />
          </div>

          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {/* identity */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#0B2447] flex items-center justify-center text-white shrink-0">
                  <User size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[18px] font-bold text-gray-900 truncate">{displayName}</h2>
                  <p className="text-[12px] text-gray-500 truncate">{profile.email}</p>
                </div>
                <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">
                  {profile.role}
                </span>
              </div>

              {/* details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <InfoRow label={t("fullName")} value={displayName} />
                <InfoRow label={t("email")} value={profile.email} />
                <InfoRow label={t("phone")} value={profile.phone} />
                <InfoRow label={t("role")} value={profile.role} />
                <InfoRow label={t("accountId")} value={profile.id} mono />
                <InfoRow label={t("memberSince")} value={joined} />
              </div>

              {/* actions */}
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-gray-100">
                <button onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-[12px] font-semibold">
                  <Pencil size={13} /> {t("editProfile")}
                </button>
                <Link href={getRedirectByRole(profile.role)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-4 py-2 text-[12px] font-semibold">
                  <LayoutDashboard size={13} /> {t("dashboard")}
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/login" })}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 text-[12px] font-semibold">
                  <LogOut size={13} /> {t("navLogout")}
                </button>
              </div>
            </div>
          </div>
        </main>

        {editOpen && profile && (
          <EditProfileModal
            profile={profile}
            onClose={() => setEditOpen(false)}
            onSaved={(updated) => setProfile(updated)}
          />
        )}
      </div>
    )
  }

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
            <span className="text-[24px] font-extrabold tracking-wide drop-shadow-lg group-hover:text-white/90 transition-colors"
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
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {(session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN") && (
              <Link href={getRedirectByRole(session.user.role)}
                className="bg-blue-500/70 hover:bg-blue-600/80 backdrop-blur-sm px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-[12px] border border-white/20 transition-all">
                <Star size={12} /> {session.user.role === "SUPERADMIN" ? "SuperAdmin Panel" : "Admin Panel"}
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
                <span className={`${roleColor} backdrop-blur text-white text-[11px] font-bold px-3 py-0.5 rounded-full tracking-widest uppercase shadow`}>
                  {profile?.role}
                </span>
                {profile?.id && (
                  <>
                    <span className="text-white/50">·</span>
                    <span className="bg-white/15 backdrop-blur text-white/90 text-[11px] font-mono px-2.5 py-0.5 rounded-full shadow">
                      ID: {profile.id}
                    </span>
                  </>
                )}
                {profile?.createdAt && (
                  <>
                    <span className="text-white/50">·</span>
                    <span className="text-white/80 text-[12px] drop-shadow">
                      ສະໝັກເມື່ອ {new Date(profile.createdAt).toLocaleDateString("lo-LA", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </>
                )}
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
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-30 w-full max-w-5xl px-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 flex flex-wrap items-end gap-4 border border-gray-100">

            <div className="flex-[1.5] min-w-[170px]">
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">ຈອງຫ້ອງ</p>
              <RoomSelect rooms={rooms} value={selectedRoom} onChange={setSelectedRoom} placeholder="ເລືອກຫ້ອງ" />
            </div>

            <div className="flex-1 min-w-[120px]">
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">ວັນທີເຂົ້າພັກ</p>
              <input type="date" min={today} value={checkIn} onChange={(e) => {
                setCheckIn(e.target.value)
                if (checkOut && e.target.value >= checkOut) setCheckOut("")
              }}
                className="w-full border-b border-gray-300 pb-1.5 text-[13px] text-gray-900 outline-none focus:border-blue-500" />
            </div>

            <div className="flex-1 min-w-[120px]">
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">ວັນທີເຊັກເອົາ</p>
              <input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border-b border-gray-300 pb-1.5 text-[13px] text-gray-900 outline-none focus:border-blue-500" />
            </div>

            <button onClick={handleBook}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-all shadow-sm">
              ຈອງຫ້ອງ
            </button>

            <Link href="/history"
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-all shadow-sm">
              ປະຫວັດການຈອງ
            </Link>

            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
              <input type="text" placeholder="ຄົ້ນຫາ..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2.5 pl-8 pr-3 border border-gray-300 rounded-lg bg-white text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
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
            <span className="text-[11px] text-gray-500">({rooms.length} ຫ້ອງ)</span>
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
          <div className="text-center py-20 text-gray-500">
            <Bed size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[14px]">ບໍ່ພົບຫ້ອງທີ່ຄົ້ນຫາ</p>
          </div>
        )}

        {/* Cards */}
        {!loadRooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {rooms.map((room) => {
              const blocked = !room.available
              return (
              <div key={room.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 group ${blocked ? "border-gray-200 opacity-70" : "border-gray-100 hover:shadow-xl hover:-translate-y-1"}`}>
                <div className="relative h-48 w-full overflow-hidden">
                  <Image src={getRoomCover(room)} alt={room.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className={`object-cover transition-transform duration-300 ${blocked ? "grayscale" : "group-hover:scale-105"}`}
                    onError={(e) => { (e.target as HTMLImageElement).src = "/room.png" }} />
                  {room.featured && (
                    <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      ⭐ Featured
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

                <div className="p-5">
                  <h3 className="text-[14px] font-bold text-gray-900 truncate">{room.name}</h3>
                  <p className="text-[12px] text-gray-500 mt-0.5">{room.view}</p>

                  <div className="flex items-center gap-3.5 mt-2.5 text-[12px] font-medium text-gray-600">
                    <span className="flex items-center gap-1"><Bed   size={13} className="text-gray-500" /> {room.bedType}</span>
                    <span className="flex items-center gap-1"><Users size={13} className="text-gray-500" /> {room.capacity} ຄົນ</span>
                    {room.size != null && (
                      <span className="flex items-center gap-1"><Eye   size={13} className="text-gray-500" /> {room.size} m²</span>
                    )}
                  </div>

                  {room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {room.amenities.slice(0, 3).map((a) => (
                        <span key={a} className="flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {a.toLowerCase().includes("wifi") ? <Wifi size={10} /> : <Wind size={10} />}
                          {a}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-[11px] font-medium text-gray-500 px-1.5">+{room.amenities.length - 3}</span>
                      )}
                    </div>
                  )}

                  <button
                    disabled={blocked}
                    onClick={() => {
                      if (blocked) return
                      setSelectedRoom(room.id)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className={`w-full mt-4 py-2.5 border-2 rounded-xl text-[12px] font-bold tracking-wide transition-all active:scale-95 ${blocked ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400" : "border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"}`}>
                    ເລືອກຫ້ອງນີ້
                  </button>
                </div>
              </div>
            )})}
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
