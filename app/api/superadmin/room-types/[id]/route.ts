import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

function asStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean)
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean)
  return []
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const data: Record<string, unknown> = {}

    if (body.typeName !== undefined) {
      const typeName = String(body.typeName).trim()
      if (!typeName) return NextResponse.json({ error: "typeName is required" }, { status: 400 })
      data.typeName = typeName
    }
    if (body.basePrice !== undefined) {
      const basePrice = Number(body.basePrice)
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        return NextResponse.json({ error: "basePrice must be greater than 0" }, { status: 400 })
      }
      data.basePrice = basePrice
    }
    if (body.maxGuests !== undefined) {
      const maxGuests = Number(body.maxGuests)
      if (!Number.isInteger(maxGuests) || maxGuests < 1) {
        return NextResponse.json({ error: "maxGuests must be at least 1" }, { status: 400 })
      }
      data.maxGuests = maxGuests
    }
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null
    if (body.images !== undefined) data.images = JSON.stringify(asStringArray(body.images))
    if (body.amenities !== undefined) data.amenities = JSON.stringify(asStringArray(body.amenities))
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)

    const roomType = await prisma.roomType.update({ where: { id }, data })
    return NextResponse.json({ ...roomType, basePrice: Number(roomType.basePrice) })
  } catch (error) {
    console.error("[SUPERADMIN_ROOM_TYPES_PATCH]", error)
    return NextResponse.json({ error: "Failed to update room type" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.roomType.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SUPERADMIN_ROOM_TYPES_DELETE]", error)
    return NextResponse.json({ error: "Failed to deactivate room type" }, { status: 500 })
  }
}
