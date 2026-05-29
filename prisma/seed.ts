import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Start seeding...")

  // ─────────────────────────────────────────────────────────────
  // 1. ROOM TYPES
  // ─────────────────────────────────────────────────────────────
  const roomTypes = [
    {
      id:          "rt-bungalow",
      typeName:    "Bungalow",
      description: "Traditional Lao-style bungalow with river or garden view",
      basePrice:   75,
      maxGuests:   2,
      amenities:   ["Air Conditioning", "Free WiFi", "Private Bathroom", "Mini Bar"],
    },
    {
      id:          "rt-suite",
      typeName:    "Suite",
      description: "Spacious suite with separate living area and premium amenities",
      basePrice:   120,
      maxGuests:   3,
      amenities:   ["Air Conditioning", "Free WiFi", "Living Area", "Coffee Machine", "Mini Bar", "Safe Box"],
    },
    {
      id:          "rt-cottage",
      typeName:    "Cottage",
      description: "Charming cottage nestled in tropical garden",
      basePrice:   60,
      maxGuests:   2,
      amenities:   ["Air Conditioning", "Free WiFi", "Garden Access", "Mini Fridge"],
    },
    {
      id:          "rt-villa",
      typeName:    "Villa",
      description: "Spacious multi-bedroom villa for families",
      basePrice:   150,
      maxGuests:   5,
      amenities:   ["Air Conditioning", "Free WiFi", "Two Bedrooms", "Private Patio", "Mini Bar", "Safe Box"],
    },
    {
      id:          "rt-dorm",
      typeName:    "Dormitory",
      description: "Budget-friendly shared accommodation",
      basePrice:   25,
      maxGuests:   1,
      amenities:   ["Fan", "Free WiFi", "Shared Bathroom", "Locker"],
    },
  ]

  for (const rt of roomTypes) {
    await prisma.roomType.upsert({
      where:  { id: rt.id },
      update: {},
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
  const rooms = [
    {
      id:          "room-1",
      roomNumber:  "101",
      name:        "Riverside Bungalow",
      roomTypeId:  "rt-bungalow",
      description: "Wake up to stunning views of the Nam Ou River from your private balcony.",
      price:       85,
      capacity:    2,
      size:        35,
      bedType:     "King",
      view:        "River View",
      featured:    true,
      amenities:   ["Air Conditioning", "Private Balcony", "River View", "Free WiFi", "Mini Bar", "Safe Box"],
      images:      ["/luxury-riverside-bungalow-with-wooden-deck-overloo.jpg", "/cozy-bedroom-with-king-bed-and-river-view-window.jpg"],
    },
    {
      id:          "room-2",
      roomNumber:  "201",
      name:        "Mountain View Suite",
      roomTypeId:  "rt-suite",
      description: "Experience the majesty of Nongkhiaw's limestone karsts from this elevated suite.",
      price:       120,
      capacity:    3,
      size:        50,
      bedType:     "King + Sofa Bed",
      view:        "Mountain View",
      featured:    true,
      amenities:   ["Air Conditioning", "Private Terrace", "Mountain View", "Free WiFi", "Mini Bar", "Safe Box", "Living Area", "Coffee Machine"],
      images:      ["/luxury-mountain-view-suite-with-panoramic-windows-.jpg", "/elegant-living-room-with-mountain-views.jpg"],
    },
    {
      id:          "room-3",
      roomNumber:  "102",
      name:        "Garden Cottage",
      roomTypeId:  "rt-cottage",
      description: "Nestled among tropical gardens, this charming cottage offers a peaceful retreat.",
      price:       65,
      capacity:    2,
      size:        28,
      bedType:     "Queen",
      view:        "Garden View",
      featured:    false,
      amenities:   ["Air Conditioning", "Garden Access", "Free WiFi", "Mini Fridge", "Outdoor Seating"],
      images:      ["/tropical-garden-cottage-with-lush-greenery-in-laos.jpg", "/cozy-cottage-bedroom-with-natural-decor.jpg"],
    },
    {
      id:          "room-4",
      roomNumber:  "301",
      name:        "Family Villa",
      roomTypeId:  "rt-villa",
      description: "Spacious two-bedroom villa ideal for families. Children under 12 stay free.",
      price:       150,
      capacity:    5,
      size:        70,
      bedType:     "King + Twin Beds",
      view:        "Garden & River View",
      featured:    true,
      amenities:   ["Air Conditioning", "Two Bedrooms", "Private Patio", "Free WiFi", "Mini Bar", "Safe Box", "Family Friendly", "Crib Available"],
      images:      ["/spacious-family-villa-with-tropical-architecture.jpg", "/family-bedroom-with-twin-beds-for-children.jpg"],
    },
    {
      id:          "room-5",
      roomNumber:  "202",
      name:        "Honeymoon Suite",
      roomTypeId:  "rt-suite",
      description: "Our most romantic accommodation featuring a canopy bed and private plunge pool.",
      price:       200,
      capacity:    2,
      size:        55,
      bedType:     "King Canopy",
      view:        "River View",
      featured:    true,
      amenities:   ["Air Conditioning", "Private Plunge Pool", "River View", "Free WiFi", "Mini Bar", "Safe Box", "Spa Access", "Romantic Setup"],
      images:      ["/romantic-honeymoon-suite-with-canopy-bed-and-river.jpg", "/private-plunge-pool-overlooking-river.jpg"],
    },
    {
      id:          "room-6",
      roomNumber:  "D01",
      name:        "Backpacker Dorm",
      roomTypeId:  "rt-dorm",
      description: "Budget-friendly shared accommodation with comfortable beds and social atmosphere.",
      price:       25,
      capacity:    1,
      size:        8,
      bedType:     "Single Bunk",
      view:        "Garden View",
      featured:    false,
      amenities:   ["Fan", "Shared Bathroom", "Free WiFi", "Locker", "Common Area Access"],
      images:      ["/placeholder.svg?height=600&width=800"],
    },
  ]

  for (const room of rooms) {
    await prisma.room.upsert({
      where:  { id: room.id },
      update: {},
      create: {
        id:          room.id,
        roomNumber:  room.roomNumber,
        name:        room.name,
        roomTypeId:  room.roomTypeId,
        description: room.description,
        price:       room.price,
        capacity:    room.capacity,
        size:        room.size,
        bedType:     room.bedType,
        view:        room.view,
        featured:    room.featured,
        amenities:   JSON.stringify(room.amenities),
        images:      JSON.stringify(room.images),
        status:      "AVAILABLE",
        isActive:    true,
      },
    })
    console.log(`✅ Room: ${room.name} (${room.roomNumber})`)
  }

  // ─────────────────────────────────────────────────────────────
  // 3. SUPERADMIN USER
  // ─────────────────────────────────────────────────────────────
  const superPassword = await bcrypt.hash("superadmin1234", 10)
  const superUser = await prisma.user.upsert({
    where:  { email: "superadmin@resort.com" },
    update: {},
    create: {
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
  await prisma.user.upsert({
    where:  { email: "user@test.com" },
    update: {},
    create: {
      email:    "user@test.com",
      password: userPassword,
      name:     "ທ້າວ",
      lastName: "ທົດສອບ",
      phone:    "020111111",
      role:     "USER",
    },
  })
  console.log("✅ Test User: user@test.com")

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