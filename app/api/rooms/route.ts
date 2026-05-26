import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search   = searchParams.get("search") ?? ""
    const featured = searchParams.get("featured")

    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
        ...(featured === "true" ? { featured: true } : {}),
        ...(search
          ? {
              OR: [
                { name:        { contains: search } },
                { description: { contains: search } },
                { view:        { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
      select: {
        id:          true,
        name:        true,
        description: true,
        price:       true,
        capacity:    true,
        size:        true,
        bedType:     true,
        view:        true,
        images:      true,   // JSON string
        amenities:   true,   // JSON string
        featured:    true,
        imageUrl:    true,
      },
    })

    // parse JSON fields
    const parsed = rooms.map((r) => ({
      ...r,
      price:     Number(r.price),
      images:    safeParseJson(r.images,    []),
      amenities: safeParseJson(r.amenities, []),
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("[ROOMS_GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}