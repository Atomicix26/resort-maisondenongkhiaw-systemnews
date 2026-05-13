import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const rooms = [
        {
    id: "room-1",
    name: "Riverside Bungalow",
    description:
      "Wake up to stunning views of the Nam Ou River from your private balcony. This spacious bungalow features traditional Lao design with modern comforts, including a king-size bed, en-suite bathroom, and air conditioning.",
    price: 85,
    capacity: 2,
    size: 35,
    bedType: "King",
    view: "River View",
    amenities: ["Air Conditioning", "Private Balcony", "River View", "Free WiFi", "Mini Bar", "Safe Box"],
    images: ["/luxury-riverside-bungalow-with-wooden-deck-overloo.jpg", "/cozy-bedroom-with-king-bed-and-river-view-window.jpg", "/modern-bathroom-with-natural-stone-finishes.jpg"],
    featured: true,
    available: true,
  },
  {
    id: "room-2",
    name: "Mountain View Suite",
    description:
      "Experience the majesty of Nongkhiaw's limestone karsts from this elevated suite. Features a separate living area, private terrace, and luxurious amenities for an unforgettable stay.",
    price: 120,
    capacity: 3,
    size: 50,
    bedType: "King + Sofa Bed",
    view: "Mountain View",
    amenities: [
      "Air Conditioning",
      "Private Terrace",
      "Mountain View",
      "Free WiFi",
      "Mini Bar",
      "Safe Box",
      "Living Area",
      "Coffee Machine",
    ],
    images: ["/luxury-mountain-view-suite-with-panoramic-windows-.jpg", "/elegant-living-room-with-mountain-views.jpg", "/spacious-bathroom-with-rainfall-shower.jpg"],
    featured: true,
    available: true,
  },
  {
    id: "room-3",
    name: "Garden Cottage",
    description:
      "Nestled among tropical gardens, this charming cottage offers a peaceful retreat. Perfect for couples seeking tranquility with easy access to the resort's amenities.",
    price: 65,
    capacity: 2,
    size: 28,
    bedType: "Queen",
    view: "Garden View",
    amenities: ["Air Conditioning", "Garden Access", "Free WiFi", "Mini Fridge", "Outdoor Seating"],
    images: ["/tropical-garden-cottage-with-lush-greenery-in-laos.jpg", "/cozy-cottage-bedroom-with-natural-decor.jpg", "/private-garden-sitting-area.jpg"],
    featured: false,
    available: true,
  },
  {
    id: "room-4",
    name: "Family Villa",
    description:
      "Spacious two-bedroom villa ideal for families. Features interconnected rooms, a large bathroom, and a private patio with garden views. Children under 12 stay free.",
    price: 150,
    capacity: 5,
    size: 70,
    bedType: "King + Twin Beds",
    view: "Garden & River View",
    amenities: [
      "Air Conditioning",
      "Two Bedrooms",
      "Private Patio",
      "Free WiFi",
      "Mini Bar",
      "Safe Box",
      "Family Friendly",
      "Crib Available",
    ],
    images: ["/spacious-family-villa-with-tropical-architecture.jpg", "/family-bedroom-with-twin-beds-for-children.jpg", "/private-patio-with-outdoor-dining-area.jpg"],
    featured: true,
    available: true,
  },
  {
    id: "room-5",
    name: "Honeymoon Suite",
    description:
      "Our most romantic accommodation featuring a canopy bed, private plunge pool, and panoramic river views. Includes champagne on arrival and couples spa treatment.",
    price: 200,
    capacity: 2,
    size: 55,
    bedType: "King Canopy",
    view: "River View",
    amenities: [
      "Air Conditioning",
      "Private Plunge Pool",
      "River View",
      "Free WiFi",
      "Mini Bar",
      "Safe Box",
      "Spa Access",
      "Romantic Setup",
    ],
    images: ["/romantic-honeymoon-suite-with-canopy-bed-and-river.jpg", "/private-plunge-pool-overlooking-river.jpg", "/luxurious-bathroom-with-couples-bathtub.jpg"],
    featured: true,
    available: true,
  },
  {
    id: "room-6",
    name: "Backpacker Dorm",
    description:
      "Budget-friendly shared accommodation with comfortable beds and social atmosphere. Includes access to shared bathroom, common area, and all resort facilities.",
    price: 25,
    capacity: 1,
    size: 8,
    bedType: "Single Bunk",
    view: "Garden View",
    amenities: ["Fan", "Shared Bathroom", "Free WiFi", "Locker", "Common Area Access"],
    images: [
      "/placeholder.svg?height=600&width=800",
      "/placeholder.svg?height=600&width=800",
      "/placeholder.svg?height=600&width=800",
    ],
    featured: false,
    available: true,
  },
    ]

console.log('🌱 Start seeding...')

  for (const room of rooms) {

    const result = await prisma.room.upsert({
      where: { id: room.id },
      update: {}, 
      create: {
        id: room.id,
        name: room.name,
        description: room.description,
        price: room.price,
        capacity: room.capacity,
        size: room.size,
        bedType: room.bedType,
        view: room.view,
        amenities: JSON.stringify(room.amenities), 
        images: JSON.stringify(room.images),       
        featured: room.featured,
      }
    })
    console.log(`✅ Created room with id: ${result.id}`)
  }

  console.log('🌳 Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })