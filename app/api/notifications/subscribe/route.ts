import broadcaster from "@/lib/notifications/broadcaster"

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()

      const send = (payload: any) => {
        const s = `data: ${JSON.stringify(payload)}\n\n`
        controller.enqueue(enc.encode(s))
      }

      const listener = (data: any) => send(data)

      broadcaster.on("notification", listener)
      broadcaster.on("booking_update", listener)

      // keep-alive comment every 15s
      const keepAlive = setInterval(() => controller.enqueue(enc.encode(':keepalive\n\n')), 15000)

      // cleanup on cancel
      ;(controller as any).cleanup = () => {
        broadcaster.off("notification", listener)
        broadcaster.off("booking_update", listener)
        clearInterval(keepAlive)
      }
    },
    cancel() {
      // controller.cleanup will be set in start
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
