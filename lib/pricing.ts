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
