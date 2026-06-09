import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean)
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean)
  return []
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const all = searchParams.get("all") === "true"

    const roomTypes = await prisma.roomType.findMany({
      where: all ? undefined : { isActive: true },
      select: {
        id: true,
        typeName: true,
        description: true,
        basePrice: true,
        maxGuests: true,
        images: true,
        amenities: true,
        isActive: true,
        createdAt: true,
        _count: { select: { rooms: true, priceConfigs: true } },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(roomTypes.map((item) => ({
      ...item,
      basePrice: Number(item.basePrice),
      images: parseJson(item.images, []),
      amenities: parseJson(item.amenities, []),
    })))
  } catch (error) {
    console.error("[SUPERADMIN_ROOM_TYPES_GET]", error)
    return NextResponse.json({ error: "Failed to fetch room types" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const typeName = String(body.typeName ?? "").trim()
    const basePrice = Number(body.basePrice)
    const maxGuests = Number(body.maxGuests)

    if (!typeName || !Number.isFinite(basePrice) || basePrice <= 0 || !Number.isInteger(maxGuests) || maxGuests < 1) {
      return NextResponse.json({ error: "typeName, basePrice and maxGuests are required" }, { status: 400 })
    }

    const roomType = await prisma.roomType.create({
      data: {
        typeName,
        description: body.description ? String(body.description) : null,
        basePrice,
        maxGuests,
        images: JSON.stringify(asStringArray(body.images)),
        amenities: JSON.stringify(asStringArray(body.amenities)),
        isActive: body.isActive ?? true,
      },
    })

    return NextResponse.json({ ...roomType, basePrice: Number(roomType.basePrice) }, { status: 201 })
  } catch (error) {
    console.error("[SUPERADMIN_ROOM_TYPES_POST]", error)
    return NextResponse.json({ error: "Failed to create room type" }, { status: 500 })
  }
}
