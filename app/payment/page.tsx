"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Upload, CheckCircle2, ChevronDown } from "lucide-react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomType?: string;
  roomId?: string;     // ✅ ເພີ່ມ prop ໃໝ່
  checkIn?: string;
  checkOut?: string;
}

const roomPrices: Record<string, number> = {
  "Luxzy Room":  500000,
  "Cenima Room": 700000,
};

function calcDays(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function BookingModal({
  isOpen,
  onClose,
  roomType: initRoomType = "Luxzy Room",
  roomId: initRoomId = "001",              // ✅ default
  checkIn: initCheckIn = "",
  checkOut: initCheckOut = "",
}: BookingModalProps) {

  const [roomType, setRoomType] = useState(initRoomType);
  const [roomId,   setRoomId]   = useState(initRoomId);   // ✅ state
  const [guests,   setGuests]   = useState("2 ທ່ານ");
  const [checkIn,  setCheckIn]  = useState(initCheckIn);
  const [checkOut, setCheckOut] = useState(initCheckOut);

  useEffect(() => { setRoomType(initRoomType); }, [initRoomType]);
  useEffect(() => { setRoomId(initRoomId);     }, [initRoomId]);   // ✅ sync
  useEffect(() => { setCheckIn(initCheckIn);   }, [initCheckIn]);
  useEffect(() => { setCheckOut(initCheckOut); }, [initCheckOut]);

  if (!isOpen) return null;

  const days     = calcDays(checkIn, checkOut);
  const priceDay = roomPrices[roomType] ?? 500000;
  const total    = days * priceDay;
  const fmt      = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-lao">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">

        {/* ສ່ວນຊ້າຍ */}
        <div className="flex-[1.3] p-10 md:p-14 bg-white">
          <div className="mb-8">
            <h2 className="text-[#5B89C3] font-medium text-[15px] mb-1">ຫ້ອງ</h2>
            {/* ✅ ສະແດງເລກຫ້ອງທີ່ສົ່ງມາ */}
            <div className="font-bold text-2xl text-gray-800 font-sans">{roomId}</div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ວັນທີເຂົ້າພັກ</p>
              <div className="relative">
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full p-3.5 bg-[#E9F0F6] rounded-md text-[14px] outline-none text-gray-700 font-medium"
                />
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ວັນທີສິ້ນສຸດ</p>
              <div className="relative">
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full p-3.5 bg-[#E9F0F6] rounded-md text-[14px] outline-none text-gray-700 font-medium"
                />
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ປະເພດຫ້ອງ</p>
                <div className="relative">
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full p-3.5 bg-[#E9F0F6] rounded-md text-[14px] outline-none appearance-none font-medium text-gray-700 cursor-pointer"
                  >
                    <option value="Luxzy Room">Luxzy Room</option>
                    <option value="Cenima Room">Cenima Room</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" size={16} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ຈຳນວນຄົນ</p>
                <div className="relative">
                  <select
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full p-3.5 bg-[#E9F0F6] rounded-md text-[14px] outline-none appearance-none font-medium text-gray-700 cursor-pointer"
                  >
                    <option value="1 ທ່ານ">1 ທ່ານ</option>
                    <option value="2 ທ່ານ">2 ທ່ານ</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-8 mt-16 font-bold">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-[14px] transition-colors">
              ຍົກເລີກ
            </button>
            <button className="px-10 py-3 bg-[#5B89C3] hover:bg-[#4a72a5] text-white rounded-lg shadow-lg text-[14px] transition-all active:scale-95">
              ຊຳລະເງິນ
            </button>
          </div>
        </div>

        {/* ສ່ວນຂວາ */}
        <div className="flex-1 p-10 md:p-12 bg-[#F8FAFC] border-l border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-[12px] mb-6 uppercase tracking-widest">ລາຍລະອຽດຫ້ອງ</h3>
            <div className="relative h-40 w-full rounded-lg overflow-hidden mb-6 shadow-sm">
              <Image src="/room.png" alt="Room" fill className="object-cover" />
            </div>
            <div className="mb-5">
              <div className="text-gray-900 font-bold text-[17px] uppercase tracking-tight font-sans">
                {fmt(priceDay)} KIP / DAY
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-[0.15em]">
                ອັບໂຫຼດຫຼັກຖານການຊຳລະ
              </p>
            </div>
            <div className="flex items-stretch gap-3 mb-6">
              <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center bg-white hover:border-[#5B89C3] transition-colors cursor-pointer group min-h-[80px]">
                <Upload className="text-gray-300 group-hover:text-[#5B89C3] mb-1" size={24} />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">upload</span>
              </div>
              <div className="flex-1 bg-white p-2 border border-gray-100 rounded-xl flex items-center justify-center shadow-sm min-h-[80px]">
                <Image src="/non.png" alt="QR Code" width={72} height={72} className="object-contain" />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-gray-200/60 font-bold font-lao">
            <div className="flex justify-between text-[11px] text-gray-400 uppercase tracking-widest">
              <span>ຈຳນວນວັນ</span>
              <span className="text-gray-800 font-sans">{days > 0 ? `${days} ມື້` : "-"}</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 uppercase tracking-widest">
              <span>ລາຄາຫ້ອງ</span>
              <span className="text-gray-800 font-sans">{fmt(priceDay)} K</span>
            </div>
            <div className="flex justify-between items-end pt-4">
              <span className="text-[13px] text-gray-900 uppercase tracking-tighter">ລາຄາລວມ</span>
              <span className="text-[20px] text-gray-900 tracking-tight font-black font-sans">
                {days > 0 ? `${fmt(total)} K` : "-"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}