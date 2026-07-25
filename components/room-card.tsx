"use client"

import { useState } from "react"
import Image from "next/image"
import { Bed, Users, Eye, Wifi, Wind } from "lucide-react"
import type { TranslationKey } from "@/components/language-provider"

interface Room {
  id:          string
  name:        string
  description: string
  price:       number
  capacity:    number
  size:        number
  bedType:     string
  view:        string | null
  images:      string[]
  amenities:   string[]
  featured:    boolean
  imageUrl:    string | null
}

function getRoomCover(room: Room): string {
  if (room.images?.[0] && !room.images[0].includes("placeholder")) return room.images[0]
  if (room.imageUrl) return room.imageUrl
  return "/room.png"
}

interface RoomCardProps {
  room:     Room
  t:        (key: TranslationKey) => string
  onChoose: (id: string) => void
}

export function RoomCard({ room, t, onChoose }: RoomCardProps) {
  const [fallback, setFallback] = useState(false)

  // คำนวณตรงระหว่าง render แทนการเก็บใน state ผ่าน useEffect
  const img = fallback ? "/room.png" : getRoomCover(room)

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={img}
          alt={room.name}
          fill
          sizes="(max-width: 640px) 100vw,
                 (max-width: 1024px) 50vw,
                 (max-width: 1280px) 33vw,
                 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => {
            if (!fallback) setFallback(true)
          }}
        />
        {room.featured && (
          <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
            {t("featured")}
          </span>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[11px] font-bold text-blue-700">
          {room.price.toLocaleString()} ₭
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[13px] font-bold text-gray-900 truncate">{room.name}</h3>
        <p className="text-[12px] text-gray-500 mt-0.5 truncate">{room.view}</p>

        <div className="flex items-center gap-3.5 mt-2.5 text-[12px] font-medium text-gray-600">
          <span className="flex items-center gap-1">
            <Bed size={13} className="text-gray-500" /> {room.bedType}
          </span>
          <span className="flex items-center gap-1">
            <Users size={13} className="text-gray-500" /> {room.capacity} {t("people")}
          </span>
          {room.size != null && (
            <span className="flex items-center gap-1">
              <Eye size={13} className="text-gray-500" /> {room.size} m²
            </span>
          )}
        </div>

        {room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {room.amenities.slice(0, 3).map((a) => (
              <span key={a} className="flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                {a.toLowerCase().includes("wifi") ? <Wifi size={10} /> : <Wind size={10} />}
                {a}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="text-[11px] font-medium text-gray-500 px-1.5 py-0.5">
                +{room.amenities.length - 3}
              </span>
            )}
          </div>
        )}

        <button
          onClick={() => onChoose(room.id)}
          className="w-full mt-4 py-2.5 border-2 border-gray-800 rounded-lg text-[12px] font-bold text-gray-800 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all active:scale-95"
        >
          {t("chooseThisRoom")}
        </button>
      </div>
    </div>
  )
}