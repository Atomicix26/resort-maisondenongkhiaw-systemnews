import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const PROJECT_B_IMAGE_BASE = "https://images.unsplash.com/photo-"

const PROJECT_B_AMENITIES = {
  STANDARD: ["WiFi", "AC", "TV", "Hot Water", "Breakfast"],
  DELUXE: ["WiFi", "AC", "TV", "Hot Water", "Breakfast", "Mini Bar", "Safe Box", "Balcony"],
  SUITE: ["WiFi", "AC", "TV", "Hot Water", "Breakfast", "Mini Bar", "Safe Box", "Bathtub", "Balcony", "Living Room", "Jacuzzi"],
  VILLA: ["WiFi", "AC", "TV", "Hot Water", "Breakfast", "Mini Bar", "Safe Box", "Private Pool", "Garden", "Kitchen", "BBQ", "Living Room"],
} as const

const projectBRoomTypes = [
  {
    id:          "rt-standard",
    typeName:    "Standard",
    description: "Comfortable room for short stays with essential resort amenities",
    basePrice:   500000,
    maxGuests:   2,
    amenities:   PROJECT_B_AMENITIES.STANDARD,
  },
  {
    id:          "rt-deluxe",
    typeName:    "Deluxe",
    description: "Larger room with balcony, better views, and upgraded amenities",
    basePrice:   700000,
    maxGuests:   2,
    amenities:   PROJECT_B_AMENITIES.DELUXE,
  },
  {
    id:          "rt-suite",
    typeName:    "Suite",
    description: "Premium suite with living space, bathtub, and jacuzzi amenities",
    basePrice:   1200000,
    maxGuests:   3,
    amenities:   PROJECT_B_AMENITIES.SUITE,
  },
  {
    id:          "rt-villa",
    typeName:    "Villa",
    description: "Private villa for families and groups with pool or garden facilities",
    basePrice:   2000000,
    maxGuests:   5,
    amenities:   PROJECT_B_AMENITIES.VILLA,
  },
]

const projectBRooms = [
  {
    id:          "room-1",
    roomNumber:  "N01",
    name:        "Cozy Garden Room",
    roomTypeId:  "rt-standard",
    description: "A quiet standard room with garden atmosphere, ideal for two guests.",
    price:       500000,
    capacity:    2,
    size:        30,
    bedType:     "Queen",
    view:        "Garden View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.STANDARD,
    images:      [`${PROJECT_B_IMAGE_BASE}1631049307264-da0ec9d70304?w=800&q=80`],
  },
  {
    id:          "room-2",
    roomNumber:  "N02",
    name:        "Cinema Deluxe Room",
    roomTypeId:  "rt-deluxe",
    description: "Deluxe room with a large TV, comfortable seating, and balcony amenities.",
    price:       700000,
    capacity:    2,
    size:        42,
    bedType:     "King",
    view:        "Garden View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.DELUXE,
    images:      [`${PROJECT_B_IMAGE_BASE}1582719508461-905c673771fd?w=800&q=80`],
  },
  {
    id:          "room-3",
    roomNumber:  "N03",
    name:        "Forest Retreat Room",
    roomTypeId:  "rt-standard",
    description: "Peaceful standard room surrounded by greenery for a relaxed stay.",
    price:       500000,
    capacity:    2,
    size:        32,
    bedType:     "Queen",
    view:        "Forest View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.STANDARD,
    images:      [`${PROJECT_B_IMAGE_BASE}1566665797739-1674de7a421a?w=800&q=80`],
  },
  {
    id:          "room-4",
    roomNumber:  "N04",
    name:        "Sunset Deluxe Room",
    roomTypeId:  "rt-deluxe",
    description: "Deluxe room with balcony seating and sunset-facing resort views.",
    price:       750000,
    capacity:    2,
    size:        44,
    bedType:     "King",
    view:        "Sunset View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.DELUXE,
    images:      [`${PROJECT_B_IMAGE_BASE}1578683010236-d716f9a3f461?w=800&q=80`],
  },
  {
    id:          "room-5",
    roomNumber:  "N05",
    name:        "Hillside Standard Room",
    roomTypeId:  "rt-standard",
    description: "Fresh hillside room with a simple layout and natural surroundings.",
    price:       500000,
    capacity:    2,
    size:        30,
    bedType:     "Queen",
    view:        "Hillside View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.STANDARD,
    images:      [`${PROJECT_B_IMAGE_BASE}1590490360182-c33d57733427?w=800&q=80`],
  },
  {
    id:          "room-6",
    roomNumber:  "N06",
    name:        "Mountain View Deluxe",
    roomTypeId:  "rt-deluxe",
    description: "Deluxe room with mountain scenery and modern bathroom amenities.",
    price:       800000,
    capacity:    2,
    size:        45,
    bedType:     "King",
    view:        "Mountain View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.DELUXE,
    images:      [`${PROJECT_B_IMAGE_BASE}1611892440504-42a792e24d32?w=800&q=80`],
  },
  {
    id:          "room-7",
    roomNumber:  "N07",
    name:        "River Breeze Deluxe",
    roomTypeId:  "rt-deluxe",
    description: "Deluxe room with fresh air, balcony space, and river-side mood.",
    price:       750000,
    capacity:    2,
    size:        43,
    bedType:     "King",
    view:        "River View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.DELUXE,
    images:      [`${PROJECT_B_IMAGE_BASE}1560347876-aeef00ee58a1?w=800&q=80`],
  },
  {
    id:          "room-8",
    roomNumber:  "N08",
    name:        "Nature Standard Room",
    roomTypeId:  "rt-standard",
    description: "Affordable standard room with clean natural styling for every trip.",
    price:       480000,
    capacity:    2,
    size:        28,
    bedType:     "Queen",
    view:        "Nature View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.STANDARD,
    images:      [`${PROJECT_B_IMAGE_BASE}1586023492125-27b2c045efd7?w=800&q=80`],
  },
  {
    id:          "room-9",
    roomNumber:  "N09",
    name:        "Bamboo Deluxe Room",
    roomTypeId:  "rt-deluxe",
    description: "Warm deluxe room inspired by bamboo textures and natural materials.",
    price:       700000,
    capacity:    2,
    size:        40,
    bedType:     "King",
    view:        "Garden View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.DELUXE,
    images:      [`${PROJECT_B_IMAGE_BASE}1551776235-dde6d482980b?w=800&q=80`],
  },
  {
    id:          "room-10",
    roomNumber:  "N10",
    name:        "Green Valley Room",
    roomTypeId:  "rt-standard",
    description: "Standard room facing green valley scenery with calm resort surroundings.",
    price:       500000,
    capacity:    2,
    size:        31,
    bedType:     "Queen",
    view:        "Valley View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.STANDARD,
    images:      [`${PROJECT_B_IMAGE_BASE}1585771724684-38269d6639fd?w=800&q=80`],
  },
  {
    id:          "room-11",
    roomNumber:  "N11",
    name:        "Panorama Deluxe Room",
    roomTypeId:  "rt-deluxe",
    description: "Deluxe room with a wider balcony feel and panoramic resort view.",
    price:       800000,
    capacity:    2,
    size:        46,
    bedType:     "King",
    view:        "Panorama View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.DELUXE,
    images:      [`${PROJECT_B_IMAGE_BASE}1564078516393-cf04bd966897?w=800&q=80`],
  },
  {
    id:          "room-12",
    roomNumber:  "N12",
    name:        "Luxury Suite",
    roomTypeId:  "rt-suite",
    description: "Luxury suite with separate living space, bathtub, and premium amenities.",
    price:       1200000,
    capacity:    3,
    size:        62,
    bedType:     "King + Sofa Bed",
    view:        "Garden View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.SUITE,
    images:      [`${PROJECT_B_IMAGE_BASE}1564501049412-61c2a3083791?w=800&q=80`],
  },
  {
    id:          "room-13",
    roomNumber:  "N13",
    name:        "Executive Suite",
    roomTypeId:  "rt-suite",
    description: "Executive suite with lounge space suitable for longer business stays.",
    price:       1300000,
    capacity:    3,
    size:        64,
    bedType:     "King + Sofa Bed",
    view:        "Resort View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.SUITE,
    images:      [`${PROJECT_B_IMAGE_BASE}1571896349842-33c89424de2d?w=800&q=80`],
  },
  {
    id:          "room-14",
    roomNumber:  "N14",
    name:        "Royal Garden Suite",
    roomTypeId:  "rt-suite",
    description: "Garden-facing suite with romantic styling and premium bathroom features.",
    price:       1400000,
    capacity:    3,
    size:        68,
    bedType:     "King + Sofa Bed",
    view:        "Garden View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.SUITE,
    images:      [`${PROJECT_B_IMAGE_BASE}1596436889106-be35e843f974?w=800&q=80`],
  },
  {
    id:          "room-15",
    roomNumber:  "N15",
    name:        "Honeymoon Suite",
    roomTypeId:  "rt-suite",
    description: "Romantic suite with jacuzzi amenities and a quiet private atmosphere.",
    price:       1500000,
    capacity:    2,
    size:        70,
    bedType:     "King",
    view:        "Sunset View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.SUITE,
    images:      [`${PROJECT_B_IMAGE_BASE}1587985064135-0366536eab42?w=800&q=80`],
  },
  {
    id:          "room-16",
    roomNumber:  "N16",
    name:        "Presidential Suite",
    roomTypeId:  "rt-suite",
    description: "Large suite with dining, living space, and the most premium room setup.",
    price:       1500000,
    capacity:    3,
    size:        80,
    bedType:     "King + Sofa Bed",
    view:        "Panorama View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.SUITE,
    images:      [`${PROJECT_B_IMAGE_BASE}1618773928121-c32242e63f39?w=800&q=80`],
  },
  {
    id:          "room-17",
    roomNumber:  "N17",
    name:        "Private Pool Villa",
    roomTypeId:  "rt-villa",
    description: "Private villa with pool, kitchen, garden, and BBQ facilities.",
    price:       2000000,
    capacity:    5,
    size:        110,
    bedType:     "2 Bedrooms",
    view:        "Pool View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.VILLA,
    images:      [`${PROJECT_B_IMAGE_BASE}1540518614846-7eded433c457?w=800&q=80`],
  },
  {
    id:          "room-18",
    roomNumber:  "N18",
    name:        "Garden Villa",
    roomTypeId:  "rt-villa",
    description: "Spacious garden villa for families who want more privacy.",
    price:       2000000,
    capacity:    5,
    size:        105,
    bedType:     "2 Bedrooms",
    view:        "Garden View",
    featured:    false,
    amenities:   PROJECT_B_AMENITIES.VILLA,
    images:      [`${PROJECT_B_IMAGE_BASE}1602002418816-5c0aeef426aa?w=800&q=80`],
  },
  {
    id:          "room-19",
    roomNumber:  "N19",
    name:        "Family Villa",
    roomTypeId:  "rt-villa",
    description: "Family villa with generous shared space and complete kitchen amenities.",
    price:       2200000,
    capacity:    5,
    size:        115,
    bedType:     "2 Bedrooms",
    view:        "Garden View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.VILLA,
    images:      [`${PROJECT_B_IMAGE_BASE}1613977257363-707ba9348227?w=800&q=80`],
  },
  {
    id:          "room-20",
    roomNumber:  "N20",
    name:        "Forest Villa",
    roomTypeId:  "rt-villa",
    description: "Forest-side villa with private atmosphere and premium outdoor facilities.",
    price:       2500000,
    capacity:    5,
    size:        120,
    bedType:     "2 Bedrooms",
    view:        "Forest View",
    featured:    true,
    amenities:   PROJECT_B_AMENITIES.VILLA,
    images:      [`${PROJECT_B_IMAGE_BASE}1551882547-ff40c63fe5fa?w=800&q=80`],
  },
]

async function main() {
  console.log("🌱 Start seeding...")

  // ─────────────────────────────────────────────────────────────
  // 1. ROOM TYPES
  // ─────────────────────────────────────────────────────────────
  const roomTypes = projectBRoomTypes

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
  const rooms = projectBRooms

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
        size:        room.size,
        bedType:     room.bedType,
        view:        room.view,
        featured:    room.featured,
        amenities:   JSON.stringify(room.amenities),
        images:      JSON.stringify(room.images),
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
