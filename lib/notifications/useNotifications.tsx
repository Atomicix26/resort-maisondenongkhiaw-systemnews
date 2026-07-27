"use client"
import { useEffect } from "react"

type Payload = { type: string; data: any }

export default function useNotifications(onEvent: (p: Payload) => void) {
  useEffect(() => {
    const es = new EventSource("/api/notifications/subscribe")
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        onEvent(payload)
      } catch (err) {
        console.error("Invalid notification payload", err)
      }
    }
    es.onerror = (e) => {
      console.error("SSE error", e)
      es.close()
    }
    return () => es.close()
  }, [onEvent])
}
