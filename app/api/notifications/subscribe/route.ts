import broadcaster from "@/lib/notifications/broadcaster"

export async function GET() {
  let cleanupFn: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      let closed = false

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return
        try {
          controller.enqueue(chunk)
        } catch {
          // controller ปิดไปแล้วแบบเงียบๆ (เช่น race condition) — cleanup ทันที
          cleanupFn?.()
        }
      }

      const send = (payload: NotificationPayload) => {
        const eventName = typeof payload?.type === "string" ? payload.type : "message"
        const s = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`
        safeEnqueue(enc.encode(s))
      }

      const listener = (data: NotificationPayload) => send(data)

      broadcaster.on("notification", listener)
      broadcaster.on("booking_update", listener)

      // keep-alive comment every 15s
      const keepAlive = setInterval(() => {
        safeEnqueue(enc.encode(':keepalive\n\n'))
      }, 15000)

      // เก็บ cleanup ไว้ให้ cancel() เรียกใช้
      cleanupFn = () => {
        if (closed) return
        closed = true
        broadcaster.off("notification", listener)
        broadcaster.off("booking_update", listener)
        clearInterval(keepAlive)
      }
    },
    cancel() {
      // ตอนนี้เรียกจริงแล้ว — สำคัญมาก!
      cleanupFn?.()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}