"use client"

import { useState, useCallback } from "react"
import { CheckCircle2, Bell } from "lucide-react"
import useNotifications from "@/lib/notifications/useNotifications"

type Toast = { id: string; type: string; lo?: string; en?: string }

const TRANSLATIONS: Record<string, { lo: string; en: string; variant?: "success" | "info" | "error" }> = {
  booking_update: { lo: "ການຈອງຖືກຢືນຢັນແລ້ວ", en: "Booking confirmed", variant: "success" },
  notification:   { lo: "ແຈ້ງເຕືອນ", en: "Notification", variant: "info" },
}

export default function NotificationToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((payload: any) => {
    const type = payload.type ?? "notification"
    const map = TRANSLATIONS[type] ?? TRANSLATIONS.notification

    // prefer explicit translations in payload.data if present
    const lo = payload.data?.messageLo ?? (payload.data?.message && /[\u0E00-\u0E7F\u0E80-\u0EFF]/.test(payload.data.message) ? payload.data.message : map.lo)
    const en = payload.data?.messageEn ?? (payload.data?.message && !(/[\u0E00-\u0E7F\u0E80-\u0EFF]/.test(payload.data.message)) ? payload.data.message : map.en)

    const t: Toast = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      lo,
      en,
    }

    setToasts((s) => [t, ...s].slice(0, 3))

    // auto-remove after 6s
    setTimeout(() => setToasts((s) => s.filter(x => x.id !== t.id)), 6000)
  }, [])

  useNotifications(showToast)

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none">
      {toasts.map((t, i) => (
        <div key={t.id}
          role="status"
          className={`pointer-events-auto w-[min(720px,90vw)] max-w-2xl resort-toast transform transition-all duration-300 ease-out ${i === 0 ? "resort-toast-animate-in opacity-100" : "-translate-y-2 opacity-90"}`}>
          <div className="flex items-center gap-3 p-4 resort-toast-header">
            <CheckCircle2 className="w-6 h-6 text-white" />
            <div className="flex-1">
              <div className="font-bold text-lg font-lao">{t.lo}</div>
              <div className="text-sm opacity-90 mt-1">{t.en}</div>
            </div>
            <button onClick={() => setToasts((s) => s.filter(x => x.id !== t.id))}
              className="text-white opacity-90 hover:opacity-100 ml-2">✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
