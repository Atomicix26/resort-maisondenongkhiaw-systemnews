import { NextResponse } from "next/server"
import broadcaster from "@/lib/notifications/broadcaster"

// Dev-only helper: POST { type, data } -> broadcast to SSE clients
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const payload = { type: body.type ?? "dev_notification", data: body.data ?? null }
    broadcaster.send("notification", payload)
    return NextResponse.json({ ok: true, payload })
  } catch (err) {
    console.error("/api/notifications/emit error", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
