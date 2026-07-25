"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Check } from "lucide-react"

interface RoomOption {
  id:                 string
  name:               string
  price:              number
  available?:         boolean
  unavailableReason?: string | null
}

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
  const selectedBlocked = selected?.available === false

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 border-b border-gray-300 pb-1.5 text-left outline-none focus:border-blue-500">
        <span className={`flex-1 text-[13px] truncate ${selected ? "text-gray-900 font-medium" : "text-gray-500"}`}>
          {selected ? selected.name : placeholder}
          {selectedBlocked && (
            <span className="ml-1 text-[11px] font-semibold text-red-500">
              ({selected.unavailableReason ?? "ບໍ່ພ້ອມໃຊ້ງານ"})
            </span>
          )}
        </span>
        {selected && (
          <span className={`text-[12px] font-semibold whitespace-nowrap ${selectedBlocked ? "text-gray-400" : "text-blue-600"}`}>
            {selected.price.toLocaleString()} ₭
          </span>
        )}
        <ChevronDown size={15} className={`text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[60] max-h-64 overflow-auto bg-white rounded-xl shadow-2xl border border-gray-100 py-1">
          {rooms.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-gray-500">-</p>
          )}
          {rooms.map((r) => {
            const blocked = r.available === false
            return (
              <button key={r.id} type="button"
                disabled={blocked}
                onClick={() => { onChange(r.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed ${blocked ? "bg-gray-50" : "hover:bg-blue-50"} ${r.id === value ? "bg-blue-50/60" : ""}`}>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13px] truncate ${blocked ? "text-gray-400" : "text-gray-800"}`}>{r.name}</span>
                  {blocked && (
                    <span className="block text-[10px] font-semibold text-red-500 truncate">
                      {r.unavailableReason ?? "ບໍ່ພ້ອມໃຊ້ງານ"}
                    </span>
                  )}
                </span>
                <span className={`text-[12px] font-semibold whitespace-nowrap ${blocked ? "text-gray-400" : "text-blue-600"}`}>{r.price.toLocaleString()} ₭</span>
                {r.id === value && <Check size={14} className="text-blue-600 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
