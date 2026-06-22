import { prisma } from "@/lib/prisma"

type RoomForPricing = {
  price: number | { toString(): string }
  roomTypeId: string | null
}

export async function getEffectiveNightlyPrice(
  room: RoomForPricing,
  checkIn?: Date | null,
  checkOut?: Date | null,
) {
  const roomPrice = Number(room.price)

  if (!room.roomTypeId || !checkIn || !checkOut) {
    return { nightlyPrice: roomPrice, source: "ROOM" as const, seasonName: null as string | null }
  }

  const config = await prisma.priceConfig.findFirst({
    where: {
      roomTypeId: room.roomTypeId,
      isActive: true,
      startDate: { lt: checkOut },
      endDate: { gte: checkIn },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    select: { seasonName: true, priceAmount: true },
  })

  if (!config) {
    return { nightlyPrice: roomPrice, source: "ROOM" as const, seasonName: null as string | null }
  }

  return {
    nightlyPrice: Number(config.priceAmount),
    source: "PRICE_CONFIG" as const,
    seasonName: config.seasonName,
  }
}

// ── ราคารวมทั้งการเข้าพัก คิด "ต่อคืน" รองรับการพักข้าม season (BUG-014)
// แต่ละคืนเลือก PriceConfig ที่ priority สูงสุดซึ่งครอบคลุมคืนนั้น
// ถ้าไม่มี config ครอบคลุม → ใช้ราคาห้อง
export async function getStayPricing(
  room: RoomForPricing,
  checkIn: Date,
  checkOut: Date,
) {
  const roomPrice = Number(room.price)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000)

  type Breakdown = { date: Date; price: number; seasonName: string | null }

  if (nights <= 0) {
    return { total: 0, nights: 0, breakdown: [] as Breakdown[] }
  }

  if (!room.roomTypeId) {
    const breakdown = Array.from({ length: nights }, (_, i) => ({
      date: addDaysUTC(checkIn, i),
      price: roomPrice,
      seasonName: null,
    }))
    return { total: roomPrice * nights, nights, breakdown }
  }

  // ดึง config ที่ overlap ช่วงพักครั้งเดียว แล้ว map ทีละคืน (เรียง priority สูงก่อน)
  const configs = await prisma.priceConfig.findMany({
    where: {
      roomTypeId: room.roomTypeId,
      isActive: true,
      startDate: { lt: checkOut },
      endDate: { gte: checkIn },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    select: { seasonName: true, priceAmount: true, startDate: true, endDate: true },
  })

  let total = 0
  const breakdown: Breakdown[] = []

  for (let i = 0; i < nights; i++) {
    const night = addDaysUTC(checkIn, i)
    // configs เรียง priority สูง→ต่ำ จึงเลือกตัวแรกที่ครอบคลุมคืนนี้
    const match = configs.find((c) => c.startDate <= night && c.endDate >= night)
    const price = match ? Number(match.priceAmount) : roomPrice
    total += price
    breakdown.push({ date: night, price, seasonName: match?.seasonName ?? null })
  }

  return { total, nights, breakdown }
}

// คืนวันที่เที่ยงคืน UTC ของ checkIn + i วัน (กัน DST/time drift)
function addDaysUTC(base: Date, days: number): Date {
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days)
  )
}
