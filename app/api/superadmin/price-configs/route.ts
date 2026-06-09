import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function readDate(value: unknown) {
  const date = new Date(String(value ?? ""))
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const all = searchParams.get("all") === "true"

    const configs = await prisma.priceConfig.findMany({
      where: all ? undefined : { isActive: true },
      include: { roomType: { select: { id: true, typeName: true, basePrice: true } } },
      orderBy: [{ isActive: "desc" }, { priority: "desc" }, { startDate: "desc" }],
    })

    return NextResponse.json(configs.map((item) => ({
      ...item,
      priceAmount: Number(item.priceAmount),
      roomType: { ...item.roomType, basePrice: Number(item.roomType.basePrice) },
    })))
  } catch (error) {
    console.error("[SUPERADMIN_PRICE_CONFIGS_GET]", error)
    return NextResponse.json({ error: "Failed to fetch price configs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const roomTypeId = String(body.roomTypeId ?? "")
    const seasonName = String(body.seasonName ?? "").trim()
    const priceAmount = Number(body.priceAmount)
    const priority = Number(body.priority ?? 1)
    const startDate = readDate(body.startDate)
    const endDate = readDate(body.endDate)

    if (!roomTypeId || !seasonName || !Number.isFinite(priceAmount) || priceAmount <= 0 || !startDate || !endDate) {
      return NextResponse.json({ error: "roomTypeId, seasonName, priceAmount, startDate and endDate are required" }, { status: 400 })
    }
    if (startDate > endDate) {
      return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 })
    }

    const roomType = await prisma.roomType.findFirst({ where: { id: roomTypeId, isActive: true } })
    if (!roomType) return NextResponse.json({ error: "Room type not found" }, { status: 404 })

    const config = await prisma.priceConfig.create({
      data: {
        roomTypeId,
        seasonName,
        priceAmount,
        startDate,
        endDate,
        priority: Number.isInteger(priority) && priority > 0 ? priority : 1,
        isActive: body.isActive ?? true,
      },
    })

    return NextResponse.json({ ...config, priceAmount: Number(config.priceAmount) }, { status: 201 })
  } catch (error) {
    console.error("[SUPERADMIN_PRICE_CONFIGS_POST]", error)
    return NextResponse.json({ error: "Failed to create price config" }, { status: 500 })
  }
}
