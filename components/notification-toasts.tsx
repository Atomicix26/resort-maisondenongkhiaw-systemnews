"use client"
import { useState, useCallback } from "react"
import useNotifications from "@/lib/notifications/useNotifications"

type Toast = { id: string; title: string; body?: string }

export default function NotificationToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const onEvent = useCallback((payload: any) => {
    const t: Toast = {
      id: `${Date.now()}-${Math.random()}`,
      title: payload.type ?? "notification",
      body: payload.data?.message ?? payload.data?.id ?? JSON.stringify(payload.data ?? "")
    }
    setToasts((s) => [t, ...s].slice(0, 5))
    // auto-remove after 6s
    setTimeout(() => setToasts((s) => s.filter(x => x.id !== t.id)), 6000)
  }, [])

  useNotifications(onEvent)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto bg-white border rounded-md shadow px-4 py-2 w-80">
          <div className="font-semibold text-sm">{t.title}</div>
          {t.body && <div className="text-xs text-gray-600 mt-1 break-words">{t.body}</div>}
        </div>
      ))}
    </div>
  )
}
