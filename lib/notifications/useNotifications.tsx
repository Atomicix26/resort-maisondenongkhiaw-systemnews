"use client"
import { useEffect } from "react"

type Payload = { type: string; data?: Record<string, unknown> }

export default function useNotifications(onEvent: (p: Payload) => void) {
  useEffect(() => {
    const es = new EventSource("/api/notifications/subscribe")
    
    // Listen to generic messages
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        onEvent(payload)
      } catch (err) {
        console.error("Invalid notification payload", err)
      }
    }

    // Listen to specific event types sent by server
    const handleEvent = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data)
        onEvent(payload)
      } catch (err) {
        console.error("Invalid notification payload", err)
      }
    }

    es.addEventListener("notification", handleEvent)
    es.addEventListener("booking_update", handleEvent)
    
    es.onerror = (e) => {
      console.error("SSE error", e)
      es.close()
    }

    return () => {
      es.removeEventListener("notification", handleEvent)
      es.removeEventListener("booking_update", handleEvent)
      es.close()
    }
  }, [onEvent])
}