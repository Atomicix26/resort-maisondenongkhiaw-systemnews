"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Check } from "lucide-react"

interface RoomOption {
  id:    string
  name:  string
  price: number
}

// Dropdown เลือกห้องแบบสร้างเอง — แก้ปัญหา native <select> ที่ตัดราคา
// และมองไม่เห็นค่าที่เลือก: โชว์ชื่อห้อง (ตัดด้วย …) + ราคา (ไม่ตัด) แยกฝั่ง
export function RoomSelect({
  rooms, value, onChange, placeholder,
}: {
  rooms:       RoomOption[]
  value:       string
  onChange:    (id: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const selected = rooms.find((r) => r.id === value)

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 border-b border-gray-300 pb-1.5 text-left outline-none focus:border-blue-500">
        <span className={`flex-1 text-[13px] truncate ${selected ? "text-gray-900 font-medium" : "text-gray-500"}`}>
          {selected ? selected.name : placeholder}
        </span>
        {selected && (
          <span className="text-[12px] font-semibold text-blue-600 whitespace-nowrap">
            {selected.price.toLocaleString()} ₭
          </span>
        )}
        <ChevronDown size={15} className={`text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[60] max-h-64 overflow-auto bg-white rounded-xl shadow-2xl border border-gray-100 py-1">
          {rooms.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-gray-500">—</p>
          )}
          {rooms.map((r) => (
            <button key={r.id} type="button"
              onClick={() => { onChange(r.id); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 transition-colors ${r.id === value ? "bg-blue-50/60" : ""}`}>
              <span className="flex-1 text-[13px] text-gray-800 truncate">{r.name}</span>
              <span className="text-[12px] font-semibold text-blue-600 whitespace-nowrap">{r.price.toLocaleString()} ₭</span>
              {r.id === value && <Check size={14} className="text-blue-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
