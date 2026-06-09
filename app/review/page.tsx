"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Star, CheckCircle2, EyeOff, Flag, MessageSquare,
  LogOut, BookOpen, Users, CalendarDays, LayoutDashboard,
} from "lucide-react"
import Link from "next/link"

interface Review {
  id:        string
  rating:    number
  comment:   string | null
  createdAt: string
  deletedAt: string | null
  user:      { name: string | null; lastName: string | null }
  room:      { name: string }
  management: { id: string; status: string; reply: string | null } | null
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "รอตรวจ",   color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "อนุมัติ",   color: "bg-green-100  text-green-700"  },
  HIDDEN:   { label: "ซ่อน",     color: "bg-gray-100   text-gray-500"   },
  FLAGGED:  { label: "มีปัญหา",  color: "bg-red-100    text-red-600"    },
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} size={12}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"} />
      ))}
    </span>
  )
}

export default function ReviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [reviews,    setReviews]    = useState<Review[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState("ALL")
  const [replyText,  setReplyText]  = useState<Record<string, string>>({})
  const [saving,     setSaving]     = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status !== "authenticated")   return
    if (session?.user?.role === "USER") { router.push("/profile"); return }
    fetchReviews()
  }, [status, session, router])

  async function fetchReviews() {
    setLoading(true)
    try {
      const res  = await fetch("/api/admin/reviews")
      const data = await res.json()
      setReviews(Array.isArray(data) ? data : data.reviews ?? [])
    } catch { setReviews([]) }
    finally  { setLoading(false) }
  }

  async function updateStatus(mgmtId: string, reviewId: string, newStatus: string) {
    setSaving(reviewId)
    const reply = replyText[reviewId] ?? ""
    await fetch(`/api/admin/reviews/${mgmtId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus, reply: reply || undefined }),
    })
    await fetchReviews()
    setSaving(null)
  }

  const filtered = filter === "ALL"
    ? reviews
    : reviews.filter((r) => (r.management?.status ?? "PENDING") === filter)

  const counts = {
    ALL:      reviews.length,
    PENDING:  reviews.filter((r) => (r.management?.status ?? "PENDING") === "PENDING").length,
    APPROVED: reviews.filter((r) => r.management?.status === "APPROVED").length,
    HIDDEN:   reviews.filter((r) => r.management?.status === "HIDDEN").length,
    FLAGGED:  reviews.filter((r) => r.management?.status === "FLAGGED").length,
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">ກຳລັງໂຫລດ...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-lao">

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10">
        <div className="p-5 border-b border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Admin Panel</p>
          <p className="font-bold text-gray-900 text-sm mt-0.5">Resort MDNK1</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
            ...(session?.user?.role === "SUPERADMIN"
              ? [
                  { href: "/booking", icon: CalendarDays, label: "ຫ້ອງພັກ" },
                  { href: "/staff",   icon: Users,        label: "ພະນັກງານ" },
                ]
              : []),
            { href: "/admin/room-status", icon: CalendarDays, label: "Room Status" },
            { href: "/schedule", icon: BookOpen, label: "ຕາຕະລາງ" },
            { href: "/review",   icon: Star,     label: "ລີວິວ", active: true },
          ].map(({ href, icon: Icon, label, active }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors
                ${active ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
              <Icon size={14} /> {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={13} /> ອອກຈາກລະບົບ
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">ຈັດການລີວິວ</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">ອະນຸມັດ / ຊ່ອນ / ຕອບກັບລີວິວ</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {(["ALL","PENDING","APPROVED","HIDDEN","FLAGGED"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors
                ${filter === s
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {s === "ALL" ? "ທັງໝົດ" : STATUS_LABEL[s].label}
              <span className="ml-1.5 bg-white/20 px-1 rounded">{counts[s]}</span>
            </button>
          ))}
        </div>

        {/* Review cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Star size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">ບໍ່ມີລີວິວ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((review) => {
              const mgmt   = review.management
              const curSt  = mgmt?.status ?? "PENDING"
              const info   = STATUS_LABEL[curSt] ?? STATUS_LABEL.PENDING
              const isSaving = saving === review.id
              const userName = [review.user.name, review.user.lastName].filter(Boolean).join(" ") || "Anonymous"

              return (
                <div key={review.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StarDisplay rating={review.rating} />
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${info.color}`}>
                          {info.label}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-800 text-[13px]">{userName}</p>
                      <p className="text-[11px] text-gray-400 mb-2">ຫ້ອງ: {review.room?.name} · {new Date(review.createdAt).toLocaleDateString("lo-LA")}</p>
                      {review.comment && (
                        <p className="text-[12px] text-gray-600 bg-gray-50 rounded-lg p-3">{review.comment}</p>
                      )}
                      {mgmt?.reply && (
                        <div className="mt-2 flex gap-2 items-start bg-blue-50 rounded-lg p-3">
                          <MessageSquare size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-blue-700">{mgmt.reply}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {curSt !== "APPROVED" && (
                        <button disabled={isSaving}
                          onClick={() => mgmt && updateStatus(mgmt.id, review.id, "APPROVED")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-[11px] rounded-lg transition-colors disabled:opacity-50">
                          <CheckCircle2 size={12} /> ອະນຸມັດ
                        </button>
                      )}
                      {curSt !== "HIDDEN" && (
                        <button disabled={isSaving}
                          onClick={() => mgmt && updateStatus(mgmt.id, review.id, "HIDDEN")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[11px] rounded-lg transition-colors disabled:opacity-50">
                          <EyeOff size={12} /> ຊ່ອນ
                        </button>
                      )}
                      {curSt !== "FLAGGED" && (
                        <button disabled={isSaving}
                          onClick={() => mgmt && updateStatus(mgmt.id, review.id, "FLAGGED")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] rounded-lg transition-colors disabled:opacity-50">
                          <Flag size={12} /> ລາຍງານ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reply box */}
                  {mgmt && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={replyText[review.id] ?? mgmt.reply ?? ""}
                        onChange={(e) => setReplyText((p) => ({ ...p, [review.id]: e.target.value }))}
                        placeholder="ຕອບກັບລີວິວ..."
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 bg-white outline-none focus:border-blue-300"
                      />
                      <button disabled={isSaving}
                        onClick={() => updateStatus(mgmt.id, review.id, curSt)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] rounded-lg transition-colors disabled:opacity-50 font-medium">
                        {isSaving ? "..." : "ບັນທຶກ"}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
