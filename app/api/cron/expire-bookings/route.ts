import { type NextRequest, NextResponse } from "next/server"
import { expireStaleBookings, expireNoShowBookings } from "@/lib/expire"

// ── ຍົກເລີກ booking ທີ່ໝົດເວລາຊຳລະ (endpoint ສຳລັບ scheduler ພາຍນອກ) ──────────
// ໃຊ້ຮ່ວມກັບ lazy-cancel ໃນ /api/bookings (GET) ແລະ /api/payments (POST):
// scheduler ຍິງ endpoint ນີ້ເປັນໄລຍະ (ເຊັ່ນ ທຸກ 1 ນາທີ) ເພື່ອຍົກເລີກ booking ຄ້າງ
// ເຖິງແມ່ນລູກຄ້າຈະບໍ່ໄດ້ເປີດໜ້າ history.
//
// ຄວາມປອດໄພ: ຖ້າຕັ້ງ env CRON_SECRET → ຕ້ອງສົ່ງ header `Authorization: Bearer <secret>`
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    // 1) ໝົດເວລາຊຳລະ (10 ນາທີ) → CANCELLED · 2) ບໍ່ມາ Check-in (18:00) → NO_SHOW
    const cancelled = await expireStaleBookings()
    const noShow    = await expireNoShowBookings()
    return NextResponse.json({ cancelled, noShow })
  } catch (error) {
    console.error("[CRON_EXPIRE_BOOKINGS]", error)
    return NextResponse.json({ error: "Failed to expire bookings" }, { status: 500 })
  }
}
