import { PrismaClient, BookingStatus, PaymentMethod, PaymentStatus } from "@prisma/client"
import bcrypt from "bcryptjs"
import { nextId } from "../lib/ids"

const prisma = new PrismaClient()

// ── Resort Maison de Nongkhiaw (Nong Khiaw, Laos) — ข้อมูลจริงจาก maisondenongkhiaw.com ──
// Rack rate $90/คืน (≈1,935,000₭ @ 21,500₭/USD) รวมอาหารเช้า + รถรับส่งเข้าเมืองฟรี
// โปรโมชั่น Green Season (พ.ค.–ก.ย.) $55/คืน (≈1,182,500₭), เตียงเสริม $30/คืน (≈645,000₭)
// ห้องพักจริง 11 ห้อง ใน 5 อาคารบังกะโล ทุกห้องหันหน้าแม่น้ำอู (Nam Ou) และภูเขาหินปูน
const MDNK_AMENITIES = {
  LARGE_DOUBLE:   ["WiFi", "AC", "Ceiling Fan", "Hot Water", "Mini Fridge", "Coffee/Tea Maker", "Iron & Ironing Board", "River View", "Free Breakfast", "Free Town Shuttle"],
  DELUXE_BALCONY: ["WiFi", "AC", "Ceiling Fan", "Hot Water", "Mini Fridge", "Coffee/Tea Maker", "Iron & Ironing Board", "Private Balcony", "River View", "Free Breakfast", "Free Town Shuttle", "Extra Bed Available"],
} as const

const mdnkRoomTypes = [
  {
    id:          "rt-large-double",
    typeName:    "Large Double Room",
    description: "Spacious room with one king bed overlooking the Nam Ou River and limestone cliffs. Air conditioning plus ceiling fan, mini fridge, and coffee/tea maker. Breakfast and free shuttle to Nong Khiaw town included.",
    basePrice:   1_935_000, // ≈ $90/คืน
    maxGuests:   2,
    amenities:   MDNK_AMENITIES.LARGE_DOUBLE,
  },
  {
    id:          "rt-deluxe-balcony",
    typeName:    "Deluxe Double or Twin with Balcony",
    description: "Deluxe room with one double bed or two to three single beds and a large private balcony facing the Nam Ou River. Adjacent rooms connect via the balcony — ideal for families. Extra bed $30 (≈645,000₭). Breakfast and free town shuttle included.",
    basePrice:   1_935_000, // ≈ $90/คืน
    maxGuests:   3,
    amenities:   MDNK_AMENITIES.DELUXE_BALCONY,
  },
]

const mdnkRooms = [
  {
    id:          "room-1",
    roomNumber:  "A1",
    name:        "Nature Suite A1",
    roomTypeId:  "rt-large-double",
    description: "King-bed room in Bungalow A with a full view of the Nam Ou River and limestone mountains. Breakfast and free town shuttle included.",
    price:       1_935_000,
    capacity:    2,
    bedType:     "King",
    view:        "Nam Ou River View",
    featured:    true,
    amenities:   MDNK_AMENITIES.LARGE_DOUBLE,
  },
  {
    id:          "room-2",
    roomNumber:  "A2",
    name:        "Nature Suite A2",
    roomTypeId:  "rt-large-double",
    description: "Warm king-bed room in Bungalow A with polished teak floors and river-facing windows. Breakfast and free town shuttle included.",
    price:       1_935_000,
    capacity:    2,
    bedType:     "King",
    view:        "River & Limestone View",
    featured:    false,
    amenities:   MDNK_AMENITIES.LARGE_DOUBLE,
  },
  {
    id:          "room-3",
    roomNumber:  "B1",
    name:        "Nature Suite B1",
    roomTypeId:  "rt-large-double",
    description: "Quiet king-bed room in Bungalow B, decorated with local Lao textiles. Breakfast and free town shuttle included.",
    price:       1_935_000,
    capacity:    2,
    bedType:     "King",
    view:        "Nam Ou River View",
    featured:    false,
    amenities:   MDNK_AMENITIES.LARGE_DOUBLE,
  },
  {
    id:          "room-4",
    roomNumber:  "B2",
    name:        "Nature Suite B2",
    roomTypeId:  "rt-large-double",
    description: "King-bed room in Bungalow B facing the garden and the mountains behind the resort. Breakfast and free town shuttle included.",
    price:       1_935_000,
    capacity:    2,
    bedType:     "King",
    view:        "Garden & Mountain View",
    featured:    false,
    amenities:   MDNK_AMENITIES.LARGE_DOUBLE,
  },
  {
    id:          "room-5",
    roomNumber:  "B3",
    name:        "Nature Suite B3",
    roomTypeId:  "rt-deluxe-balcony",
    description: "Deluxe double/twin room in Bungalow B with a wide private balcony over the Nam Ou River. Extra bed available. Breakfast and free town shuttle included.",
    price:       1_935_000,
    capacity:    3,
    bedType:     "Double or Twin",
    view:        "Nam Ou River View",
    featured:    true,
    amenities:   MDNK_AMENITIES.DELUXE_BALCONY,
  },
  {
    id:          "room-6",
    roomNumber:  "C1",
    name:        "Nature Suite C1",
    roomTypeId:  "rt-deluxe-balcony",
    description: "Large deluxe room in Bungalow C with ceiling fan, balcony doors opening to the river and limestone cliffs. Extra bed available.",
    price:       1_935_000,
    capacity:    3,
    bedType:     "Double or Twin",
    view:        "River & Limestone View",
    featured:    true,
    amenities:   MDNK_AMENITIES.DELUXE_BALCONY,
  },
  {
    id:          "room-7",
    roomNumber:  "C2",
    name:        "Nature Suite C2",
    roomTypeId:  "rt-deluxe-balcony",
    description: "Deluxe double/twin room in Bungalow C; the balcony connects to the neighbouring room — ideal for families. Breakfast included.",
    price:       1_935_000,
    capacity:    3,
    bedType:     "Double or Twin",
    view:        "Nam Ou River View",
    featured:    false,
    amenities:   MDNK_AMENITIES.DELUXE_BALCONY,
  },
  {
    id:          "room-8",
    roomNumber:  "D1",
    name:        "Nature Suite D1",
    roomTypeId:  "rt-deluxe-balcony",
    description: "Deluxe double/twin room in stilted Bungalow D with mountain views from the shared veranda. Extra bed available.",
    price:       1_935_000,
    capacity:    3,
    bedType:     "Double or Twin",
    view:        "Mountain View",
    featured:    false,
    amenities:   MDNK_AMENITIES.DELUXE_BALCONY,
  },
  {
    id:          "room-9",
    roomNumber:  "D2",
    name:        "Nature Suite D2",
    roomTypeId:  "rt-deluxe-balcony",
    description: "Deluxe double/twin room in Bungalow D overlooking the garden walkway and the hills. Breakfast and free town shuttle included.",
    price:       1_935_000,
    capacity:    3,
    bedType:     "Double or Twin",
    view:        "Garden & Mountain View",
    featured:    false,
    amenities:   MDNK_AMENITIES.DELUXE_BALCONY,
  },
  {
    id:          "room-10",
    roomNumber:  "E1",
    name:        "Nature Suite E1",
    roomTypeId:  "rt-deluxe-balcony",
    description: "Hillside deluxe room in Bungalow E, steps from the riverside swimming pool. Extra bed available. Breakfast included.",
    price:       1_935_000,
    capacity:    3,
    bedType:     "Double or Twin",
    view:        "Pool & Mountain View",
    featured:    false,
    amenities:   MDNK_AMENITIES.DELUXE_BALCONY,
  },
  {
    id:          "room-11",
    roomNumber:  "E2",
    name:        "Nature Suite E2",
    roomTypeId:  "rt-deluxe-balcony",
    description: "Deluxe double/twin room in Bungalow E with balcony views over the pool deck, the Nam Ou River, and the cliffs. Extra bed available.",
    price:       1_935_000,
    capacity:    3,
    bedType:     "Double or Twin",
    view:        "Pool & Mountain View",
    featured:    true,
    amenities:   MDNK_AMENITIES.DELUXE_BALCONY,
  },
]

async function main() {
  console.log("🌱 Start seeding...")

  // ─────────────────────────────────────────────────────────────
  // 1. ROOM TYPES
  // ─────────────────────────────────────────────────────────────
  const roomTypes = mdnkRoomTypes

  for (const rt of roomTypes) {
    await prisma.roomType.upsert({
      where:  { id: rt.id },
      update: {
        typeName:    rt.typeName,
        description: rt.description,
        basePrice:   rt.basePrice,
        maxGuests:   rt.maxGuests,
        amenities:   JSON.stringify(rt.amenities),
        isActive:    true,
      },
      create: {
        id:          rt.id,
        typeName:    rt.typeName,
        description: rt.description,
        basePrice:   rt.basePrice,
        maxGuests:   rt.maxGuests,
        amenities:   JSON.stringify(rt.amenities),
      },
    })
    console.log(`✅ RoomType: ${rt.typeName}`)
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ROOMS
  // ─────────────────────────────────────────────────────────────
  const rooms = mdnkRooms

  for (const room of rooms) {
    await prisma.room.upsert({
      where:  { id: room.id },
      update: {
        roomNumber:  room.roomNumber,
        name:        room.name,
        roomTypeId:  room.roomTypeId,
        description: room.description,
        price:       room.price,
        capacity:    room.capacity,
        size:        null,
        bedType:     room.bedType,
        view:        room.view,
        featured:    room.featured,
        amenities:   JSON.stringify(room.amenities),
        images:      JSON.stringify([`/rooms/${room.id}.jpg`]),
        status:      "AVAILABLE",
        isActive:    true,
        deletedAt:   null,
      },
      create: {
        id:          room.id,
        roomNumber:  room.roomNumber,
        name:        room.name,
        roomTypeId:  room.roomTypeId,
        description: room.description,
        price:       room.price,
        capacity:    room.capacity,
        size:        null,
        bedType:     room.bedType,
        view:        room.view,
        featured:    room.featured,
        amenities:   JSON.stringify(room.amenities),
        images:      JSON.stringify([`/rooms/${room.id}.jpg`]),
        status:      "AVAILABLE",
        isActive:    true,
      },
    })
    console.log(`✅ Room: ${room.name} (${room.roomNumber})`)
  }

  const legacyRoomIds = Array.from({ length: 9 }, (_, i) => `room-${i + 12}`) // room-12..room-20
  const legacyTypeIds = ["rt-standard", "rt-deluxe", "rt-suite", "rt-villa"]
  await prisma.room.updateMany({ where: { id: { in: legacyRoomIds }, deletedAt: null }, data: { isActive: false, deletedAt: new Date() } })
  await prisma.roomType.updateMany({ where: { id: { in: legacyTypeIds } }, data: { isActive: false } })

  // ─────────────────────────────────────────────────────────────
  // 3. SUPERADMIN USER
  // ─────────────────────────────────────────────────────────────
  const superPassword = await bcrypt.hash("superadmin1234", 10)
  const superUser = await prisma.user.upsert({
    where:  { email: "superadmin@resort.com" },
    update: {},
    create: {
      id:       nextId("user"),
      email:    "superadmin@resort.com",
      password: superPassword,
      name:     "Super",
      lastName: "Admin",
      phone:    "020000001",
      role:     "SUPERADMIN",
    },
  })
  console.log(`✅ SuperAdmin: ${superUser.email}`)

  // ─────────────────────────────────────────────────────────────
  // 4. ADMIN USER + STAFF PROFILE
  // ─────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin1234", 10)
  const adminUser = await prisma.user.upsert({
    where:  { email: "admin@resort.com" },
    update: {},
    create: {
      id:       nextId("user"),
      email:    "admin@resort.com",
      password: adminPassword,
      name:     "ທ້າວ",
      lastName: "ສົມຊາຍ",
      phone:    "020000002",
      role:     "ADMIN",
    },
  })

  await prisma.staff.upsert({
    where:  { userId: adminUser.id },
    update: {},
    create: {
      id:       nextId("staff"),
      userId:   adminUser.id,
      position: "Resort Manager",
      role:     "ADMIN",
      salary:   5000000,
      isActive: true,
    },
  })
  console.log(`✅ Admin + Staff: ${adminUser.email}`)

  // ─────────────────────────────────────────────────────────────
  // 5. STAFF USERS
  // ─────────────────────────────────────────────────────────────
  const staffList = [
    { name: "ນາງ", lastName: "ມາລີ",   email: "mali@resort.com",   position: "Front Desk",   role: "STAFF" as const, salary: 2500000 },
    { name: "ທ້າວ", lastName: "ວິໄລ",  email: "vilai@resort.com",  position: "Housekeeping", role: "STAFF" as const, salary: 2000000 },
    { name: "ນາງ", lastName: "ສຸດາ",   email: "suda@resort.com",   position: "Restaurant",   role: "MANAGER" as const, salary: 3000000 },
  ]

  const staffPassword = await bcrypt.hash("staff1234", 10)
  for (const s of staffList) {
    const u = await prisma.user.upsert({
      where:  { email: s.email },
      update: {},
      create: {
        id:       nextId("user"),
        email:    s.email,
        password: staffPassword,
        name:     s.name,
        lastName: s.lastName,
        role:     "ADMIN",
      },
    })
    await prisma.staff.upsert({
      where:  { userId: u.id },
      update: {},
      create: {
        id:       nextId("staff"),
        userId:   u.id,
        position: s.position,
        role:     s.role,
        salary:   s.salary,
        isActive: true,
      },
    })
    console.log(`✅ Staff: ${s.email}`)
  }

  // ─────────────────────────────────────────────────────────────
  // 6. TEST USER (ลูกค้าทดสอบ)
  // ─────────────────────────────────────────────────────────────
  const userPassword = await bcrypt.hash("user1234", 10)
  const testUser = await prisma.user.upsert({
    where:  { email: "user@test.com" },
    update: {},
    create: {
      id:       nextId("user"),
      email:    "user@test.com",
      password: userPassword,
      name:     "ທ້າວ",
      lastName: "ທົດສອບ",
      phone:    "020111111",
      role:     "USER",
    },
  })
  console.log("✅ Test User: user@test.com")

  // ─────────────────────────────────────────────────────────────
  // 7. DEMO TRANSACTIONAL DATA — bookings ครบทุกสถานะ + payments + check-in/out
  //    logs + review + cancel/refund + price config → ทุกการ์ด/รายงานมีข้อมูลโชว์
  //    ใช้ fixed id ทั้งหมด → รัน seed ซ้ำได้ (upsert ไม่สร้างซ้ำ)
  // ─────────────────────────────────────────────────────────────
  const now  = new Date()
  const dAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)
  const dFwd = (n: number) => new Date(now.getTime() + n * 86_400_000)

  const actingStaff = await prisma.staff.findFirst({
    where: { user: { email: "admin@resort.com" } }, select: { id: true },
  })
  const staffId    = actingStaff?.id ?? null
  const verifierId = adminUser.id

  const demoCustomers = [
    { email: "somchai@example.com", name: "Somchai", lastName: "Keo",       phone: "020222001", createdDaysAgo: 60 },
    { email: "noy@example.com",     name: "Noy",     lastName: "Phabmixay", phone: "020222002", createdDaysAgo: 40 },
    { email: "dao@example.com",     name: "Dao",     lastName: "Vilaysack", phone: "020222003", createdDaysAgo: 15 },
  ]
  const custIds: string[] = []
  for (const c of demoCustomers) {
    const u = await prisma.user.upsert({
      where:  { email: c.email },
      update: { phone: c.phone },
      create: {
        id: nextId("user"), email: c.email, password: userPassword,
        name: c.name, lastName: c.lastName, phone: c.phone, role: "USER",
        createdAt: dAgo(c.createdDaysAgo),
      },
    })
    custIds.push(u.id)
  }

  // ── helper: upsert booking ──
  type BookingInput = {
    id: string; userId: string; roomId: string; checkIn: Date; checkOut: Date
    guests: number; totalPrice: number; status: BookingStatus; createdAt: Date
    actualCheckIn?: Date | null; actualCheckOut?: Date | null
    expiresAt?: Date | null; specialRequest?: string | null
  }
  const upsertBooking = async (b: BookingInput) => {
    const data = {
      userId: b.userId, roomId: b.roomId, checkIn: b.checkIn, checkOut: b.checkOut,
      guests: b.guests, totalPrice: b.totalPrice, status: b.status, createdAt: b.createdAt,
      actualCheckIn: b.actualCheckIn ?? null, actualCheckOut: b.actualCheckOut ?? null,
      expiresAt: b.expiresAt ?? null, specialRequest: b.specialRequest ?? null,
    }
    await prisma.booking.upsert({ where: { id: b.id }, update: data, create: { id: b.id, ...data } })
  }

  // ── helper: upsert CHARGE payment ──
  type ChargeInput = {
    id: string; bookingId: string; amount: number; method: PaymentMethod
    status: PaymentStatus; createdAt: Date; paymentDate?: Date | null
    verifiedAt?: Date | null; slipImage?: string | null; reason?: string | null; verified?: boolean
  }
  const upsertCharge = async (c: ChargeInput) => {
    const data = {
      bookingId: c.bookingId, type: "CHARGE" as const, amount: c.amount, method: c.method,
      status: c.status, createdAt: c.createdAt, paymentDate: c.paymentDate ?? null,
      slipImage: c.slipImage ?? null, verifiedAt: c.verifiedAt ?? null, reason: c.reason ?? null,
      verifiedById: c.verified ? staffId : null, verifiedByUserId: c.verified ? verifierId : null,
    }
    await prisma.paymentTransaction.upsert({ where: { id: c.id }, update: data, create: { id: c.id, ...data } })
  }

  const approve = (id: string, bookingId: string, apprDate: Date, ok = true) =>
    prisma.bookApproval.upsert({
      where:  { id },
      update: { status: ok ? "APPROVED" : "REJECTED", apprDate, staffId },
      create: { id, bookingId, staffId, status: ok ? "APPROVED" : "REJECTED", apprDate },
    })

  const statusLog = (id: string, roomId: string, oldS: "AVAILABLE"|"OCCUPIED"|"RESERVED"|"MAINTENANCE", newS: "AVAILABLE"|"OCCUPIED"|"RESERVED"|"MAINTENANCE", changedAt: Date, reason: string) =>
    prisma.statusRoom.upsert({
      where:  { id },
      update: { oldStatus: oldS, newStatus: newS, changedAt, reason, staffId },
      create: { id, roomId, oldStatus: oldS, newStatus: newS, changedAt, reason, staffId },
    })

  // ══ A) COMPLETED — จบครบ flow + รีวิว (room-1) ══
  await upsertBooking({ id: "bk-demo-01", userId: custIds[0], roomId: "room-1", checkIn: dAgo(10), checkOut: dAgo(8), guests: 2, totalPrice: 2_365_000, status: "COMPLETED", createdAt: dAgo(12), actualCheckIn: dAgo(10), actualCheckOut: dAgo(8), specialRequest: "Late check-in around 8pm please" })
  await upsertCharge({ id: "tx-demo-01", bookingId: "bk-demo-01", amount: 2_365_000, method: "TRANSFER", status: "PAID", createdAt: dAgo(11), paymentDate: dAgo(11), verifiedAt: dAgo(11), slipImage: "demo-slip-01.jpg", verified: true })
  await approve("apv-demo-01", "bk-demo-01", dAgo(11))
  await prisma.checkInLog.upsert({
    where: { id: "cin-demo-01" },
    update: { actualTime: dAgo(10), docType: "PASSPORT", docNumber: "P1234567", nationality: "Lao", docExpiry: dFwd(400), docImage: "demo-doc-01.jpg", remarks: "Checked in on time", staffId },
    create: { id: "cin-demo-01", bookingId: "bk-demo-01", staffId, actualTime: dAgo(10), docType: "PASSPORT", docNumber: "P1234567", nationality: "Lao", docExpiry: dFwd(400), docImage: "demo-doc-01.jpg", remarks: "Checked in on time" },
  })
  await prisma.checkOutLog.upsert({
    where: { id: "cout-demo-01" },
    update: { actualTime: dAgo(8), remarks: "Room in good condition", staffId },
    create: { id: "cout-demo-01", bookingId: "bk-demo-01", staffId, actualTime: dAgo(8), remarks: "Room in good condition" },
  })
  await prisma.review.upsert({
    where: { id: "rev-demo-01" },
    update: { rating: 5, comment: "Wonderful stay, clean and quiet room.", createdAt: dAgo(7) },
    create: { id: "rev-demo-01", bookingId: "bk-demo-01", rating: 5, comment: "Wonderful stay, clean and quiet room.", createdAt: dAgo(7) },
  })
  await prisma.reviewManage.upsert({
    where: { id: "rm-demo-01" },
    update: { status: "APPROVED", reply: "Thank you for staying with us!", actionDate: dAgo(6), staffId },
    create: { id: "rm-demo-01", reviewId: "rev-demo-01", staffId, status: "APPROVED", reply: "Thank you for staying with us!", actionDate: dAgo(6) },
  })
  await statusLog("sr-demo-01a", "room-1", "AVAILABLE", "OCCUPIED", dAgo(10), "Guest checked in")
  await statusLog("sr-demo-01b", "room-1", "OCCUPIED", "AVAILABLE", dAgo(8),  "Guest checked out")

  // ══ B) CHECKED_IN — กำลังพัก, check-in วันนี้ (room-2) ══
  await upsertBooking({ id: "bk-demo-02", userId: custIds[1], roomId: "room-2", checkIn: now, checkOut: dFwd(2), guests: 2, totalPrice: 2_365_000, status: "CHECKED_IN", createdAt: dAgo(3), actualCheckIn: now })
  await upsertCharge({ id: "tx-demo-02", bookingId: "bk-demo-02", amount: 2_365_000, method: "CREDIT_CARD", status: "PAID", createdAt: dAgo(2), paymentDate: dAgo(2), verifiedAt: dAgo(2), verified: true })
  await approve("apv-demo-02", "bk-demo-02", dAgo(2))
  await prisma.checkInLog.upsert({
    where: { id: "cin-demo-02" },
    update: { actualTime: now, docType: "ID_CARD", docNumber: "ID9988776", nationality: "Lao", docExpiry: dFwd(800), docImage: "demo-doc-02.jpg", staffId },
    create: { id: "cin-demo-02", bookingId: "bk-demo-02", staffId, actualTime: now, docType: "ID_CARD", docNumber: "ID9988776", nationality: "Lao", docExpiry: dFwd(800), docImage: "demo-doc-02.jpg" },
  })
  await statusLog("sr-demo-02", "room-2", "AVAILABLE", "OCCUPIED", now, "Guest checked in")
  await prisma.room.update({ where: { id: "room-2" }, data: { status: "OCCUPIED" } })

  // ══ C) CONFIRMED — จองล่วงหน้า, ห้อง RESERVED (room-3) ══
  await upsertBooking({ id: "bk-demo-03", userId: custIds[2], roomId: "room-3", checkIn: dFwd(3), checkOut: dFwd(5), guests: 2, totalPrice: 2_365_000, status: "CONFIRMED", createdAt: dAgo(2) })
  await upsertCharge({ id: "tx-demo-03", bookingId: "bk-demo-03", amount: 2_365_000, method: "CASH", status: "PAID", createdAt: dAgo(2), paymentDate: dAgo(2), verifiedAt: dAgo(2), verified: true })
  await approve("apv-demo-03", "bk-demo-03", dAgo(2))
  await statusLog("sr-demo-03", "room-3", "AVAILABLE", "RESERVED", dAgo(2), "Confirmed upcoming booking")
  await prisma.room.update({ where: { id: "room-3" }, data: { status: "RESERVED" } })

  // ══ D) PENDING — เพิ่งอัปสลิป รอ admin verify (room-5) ══
  await upsertBooking({ id: "bk-demo-04", userId: testUser.id, roomId: "room-5", checkIn: dFwd(7), checkOut: dFwd(9), guests: 2, totalPrice: 2_365_000, status: "PENDING", createdAt: now, expiresAt: new Date(now.getTime() + 10 * 60_000) })
  await upsertCharge({ id: "tx-demo-04", bookingId: "bk-demo-04", amount: 2_365_000, method: "TRANSFER", status: "PENDING_VERIFY", createdAt: now, paymentDate: now, slipImage: "demo-slip-04.jpg" })

  // ══ E) CANCELLED + refund 50% (room-6) ══
  await upsertBooking({ id: "bk-demo-05", userId: custIds[0], roomId: "room-6", checkIn: dFwd(4), checkOut: dFwd(6), guests: 2, totalPrice: 2_365_000, status: "CANCELLED", createdAt: dAgo(6) })
  await upsertCharge({ id: "tx-demo-05", bookingId: "bk-demo-05", amount: 2_365_000, method: "TRANSFER", status: "REFUNDED", createdAt: dAgo(5), paymentDate: dAgo(5), verifiedAt: dAgo(5), slipImage: "demo-slip-05.jpg", verified: true })
  await prisma.paymentTransaction.upsert({
    where: { id: "tx-demo-05r" },
    update: { bookingId: "bk-demo-05", type: "REFUND", amount: 1_182_500, method: "TRANSFER", status: "PAID", createdAt: dAgo(2), paymentDate: dAgo(2) },
    create: { id: "tx-demo-05r", bookingId: "bk-demo-05", type: "REFUND", amount: 1_182_500, method: "TRANSFER", status: "PAID", createdAt: dAgo(2), paymentDate: dAgo(2) },
  })
  await prisma.cancelRequest.upsert({
    where: { id: "cr-demo-05" },
    update: { reason: "Change of travel plan", status: "APPROVED", refundable: true, refundPercent: 50, refundAmount: 1_182_500, refundBankName: "BCEL", refundAccountName: "Somchai Keo", refundAccountNumber: "0101234567", requestDate: dAgo(3), actionDate: dAgo(2), staffId },
    create: { id: "cr-demo-05", bookingId: "bk-demo-05", userId: custIds[0], reason: "Change of travel plan", status: "APPROVED", refundable: true, refundPercent: 50, refundAmount: 1_182_500, refundBankName: "BCEL", refundAccountName: "Somchai Keo", refundAccountNumber: "0101234567", requestDate: dAgo(3), actionDate: dAgo(2), staffId },
  })

  // ══ F) NO_SHOW — สลิปถูกปฏิเสธ (มี reason) (room-8) ══
  await upsertBooking({ id: "bk-demo-06", userId: custIds[1], roomId: "room-8", checkIn: dAgo(2), checkOut: dAgo(1), guests: 2, totalPrice: 1_182_500, status: "NO_SHOW", createdAt: dAgo(4) })
  await upsertCharge({ id: "tx-demo-06", bookingId: "bk-demo-06", amount: 1_182_500, method: "TRANSFER", status: "FAILED", createdAt: dAgo(4), verifiedAt: dAgo(3), slipImage: "demo-slip-06.jpg", reason: "Payment slip rejected - amount mismatch", verified: true })

  // ══ G) CHECKED_OUT — ออกวันนี้ (room-9) ══
  await upsertBooking({ id: "bk-demo-07", userId: custIds[2], roomId: "room-9", checkIn: dAgo(3), checkOut: now, guests: 2, totalPrice: 3_547_500, status: "CHECKED_OUT", createdAt: dAgo(5), actualCheckIn: dAgo(3), actualCheckOut: now })
  await upsertCharge({ id: "tx-demo-07", bookingId: "bk-demo-07", amount: 3_547_500, method: "CREDIT_CARD", status: "PAID", createdAt: dAgo(4), paymentDate: dAgo(4), verifiedAt: dAgo(4), verified: true })
  await approve("apv-demo-07", "bk-demo-07", dAgo(4))
  await prisma.checkInLog.upsert({
    where: { id: "cin-demo-07" },
    update: { actualTime: dAgo(3), docType: "OTHER", docNumber: "OT5566778", nationality: "Thai", docExpiry: dFwd(200), docImage: "demo-doc-07.jpg", staffId },
    create: { id: "cin-demo-07", bookingId: "bk-demo-07", staffId, actualTime: dAgo(3), docType: "OTHER", docNumber: "OT5566778", nationality: "Thai", docExpiry: dFwd(200), docImage: "demo-doc-07.jpg" },
  })
  await prisma.checkOutLog.upsert({
    where: { id: "cout-demo-07" },
    update: { actualTime: now, remarks: "Checked out, awaiting final review", staffId },
    create: { id: "cout-demo-07", bookingId: "bk-demo-07", staffId, actualTime: now, remarks: "Checked out, awaiting final review" },
  })
  await statusLog("sr-demo-07", "room-9", "AVAILABLE", "OCCUPIED", dAgo(3), "Guest checked in")

  // ── ห้องซ่อมบำรุง 1 ห้อง (ให้การ์ด maintenance > 0) ──
  await statusLog("sr-demo-m4", "room-4", "AVAILABLE", "MAINTENANCE", dAgo(1), "Aircon repair")
  await prisma.room.update({ where: { id: "room-4" }, data: { status: "MAINTENANCE" } })

  // ── seasonal price config — Green Season Special $55/คืน (พ.ค.–ก.ย.) จากเว็บทางการ ──
  const greenSeason = {
    seasonName:  "Green Season Special",
    priceAmount: 1_182_500, // ≈ $55/คืน
    startDate:   new Date("2026-05-01T00:00:00Z"),
    endDate:     new Date("2026-09-30T23:59:59Z"),
    priority:    2,
    isActive:    true,
  }
  const greenTargets = ["rt-large-double", "rt-deluxe-balcony"]
  for (const [i, roomTypeId] of greenTargets.entries()) {
    const id = `pc-demo-0${i + 1}`
    await prisma.priceConfig.upsert({
      where:  { id },
      update: { roomTypeId, ...greenSeason },
      create: { id, roomTypeId, ...greenSeason },
    })
  }

  // ── demo access logs (login → logout ครบคู่) เพื่อให้หน้า logs โชว์คอลัมน์ Logout ──
  const demoSessions = [
    { id: "al-demo-01", userId: adminUser.id, userType: "ADMIN"      as const, ip: "192.168.1.10", loginAgoDays: 1, hours: 3 },
    { id: "al-demo-02", userId: superUser.id, userType: "SUPERADMIN" as const, ip: "192.168.1.11", loginAgoDays: 2, hours: 1 },
    { id: "al-demo-03", userId: custIds[0],   userType: "USER"       as const, ip: "203.0.113.5",  loginAgoDays: 1, hours: 2 },
  ]
  for (const s of demoSessions) {
    const login  = dAgo(s.loginAgoDays)
    const logout = new Date(login.getTime() + s.hours * 3_600_000)
    await prisma.accessLog.upsert({
      where:  { id: s.id },
      update: { userId: s.userId, userType: s.userType, ipAddress: s.ip, loginTime: login, logoutTime: logout },
      create: { id: s.id, userId: s.userId, userType: s.userType, ipAddress: s.ip, loginTime: login, logoutTime: logout },
    })
  }

  console.log("✅ Demo data: 7 bookings (ทุกสถานะ) + payments/logs/review/refund + price config + access logs")

  console.log("\n🎉 Seeding completed!")
  console.log("─────────────────────────────")
  console.log("🔑 Login credentials:")
  console.log("   SuperAdmin : superadmin@resort.com / superadmin1234")
  console.log("   Admin      : admin@resort.com      / admin1234")
  console.log("   Staff      : mali@resort.com       / staff1234")
  console.log("   Test User  : user@test.com         / user1234")
  console.log("─────────────────────────────")
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
