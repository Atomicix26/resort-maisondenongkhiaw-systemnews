"use client"
import { useEffect, useRef } from "react"

type Payload = { type: string; data: any }

export default function useNotifications(onEvent: (p: Payload) => void) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent // เก็บ callback ล่าสุดไว้ ไม่ต้องพึ่ง dependency

  useEffect(() => {
    let es: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let retryDelay = 1000 // เริ่มที่ 1s แล้ว backoff แบบ exponential
    let stopped = false

    const handleEvent = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data)
        onEventRef.current(payload)
      } catch (err) {
        console.error("Invalid notification payload", err)
      }
    }

    const connect = () => {
      es = new EventSource("/api/notifications/subscribe")

      es.onopen = () => {
        retryDelay = 1000 // reset delay เมื่อเชื่อมต่อสำเร็จ
        console.debug("notifications: connected")
      }

      es.onmessage = handleEvent
      es.addEventListener("notification", handleEvent)
      es.addEventListener("booking_update", handleEvent)

      es.onerror = () => {
        es?.close()
        if (stopped) return
        // reconnect แบบ exponential backoff (สูงสุด 30s)
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000)
          connect()
        }, retryDelay)
      }
    }

    connect()

    return () => {
      stopped = true
      if (retryTimeout) clearTimeout(retryTimeout)
      es?.close()
    }
  }, []) // ไม่ผูกกับ onEvent แล้ว เชื่อมต่อครั้งเดียวตอน mount
}