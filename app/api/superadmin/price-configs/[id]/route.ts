import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

function readDate(value: unknown) {
  const date = new Date(String(value ?? ""))
  return Number.isNaN(date.getTime()) ? null : date
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

    if (body.roomTypeId !== undefined) data.roomTypeId = String(body.roomTypeId)
    if (body.seasonName !== undefined) {
      const seasonName = String(body.seasonName).trim()
      if (!seasonName) return NextResponse.json({ error: "seasonName is required" }, { status: 400 })
      data.seasonName = seasonName
    }
    if (body.priceAmount !== undefined) {
      const priceAmount = Number(body.priceAmount)
      if (!Number.isFinite(priceAmount) || priceAmount <= 0) {
        return NextResponse.json({ error: "priceAmount must be greater than 0" }, { status: 400 })
      }
      data.priceAmount = priceAmount
    }
    if (body.priority !== undefined) {
      const priority = Number(body.priority)
      if (!Number.isInteger(priority) || priority < 1) {
        return NextResponse.json({ error: "priority must be at least 1" }, { status: 400 })
      }
      data.priority = priority
    }
    if (body.startDate !== undefined) {
      const startDate = readDate(body.startDate)
      if (!startDate) return NextResponse.json({ error: "Invalid startDate" }, { status: 400 })
      data.startDate = startDate
    }
    if (body.endDate !== undefined) {
      const endDate = readDate(body.endDate)
      if (!endDate) return NextResponse.json({ error: "Invalid endDate" }, { status: 400 })
      data.endDate = endDate
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)

    const merged = await prisma.priceConfig.findUnique({ where: { id } })
    if (!merged) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const nextStart = data.startDate instanceof Date ? data.startDate : merged.startDate
    const nextEnd = data.endDate instanceof Date ? data.endDate : merged.endDate
    if (nextStart > nextEnd) {
      return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 })
    }

    const config = await prisma.priceConfig.update({ where: { id }, data })
    return NextResponse.json({ ...config, priceAmount: Number(config.priceAmount) })
  } catch (error) {
    console.error("[SUPERADMIN_PRICE_CONFIGS_PATCH]", error)
    return NextResponse.json({ error: "Failed to update price config" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.priceConfig.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SUPERADMIN_PRICE_CONFIGS_DELETE]", error)
    return NextResponse.json({ error: "Failed to deactivate price config" }, { status: 500 })
  }
}
