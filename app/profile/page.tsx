"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Search, Bed, User, Bookmark, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import BookingModal from "@/app/payment/page";
import HistoryModal from "@/app/history/page";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  const [isBookingOpen,    setIsBookingOpen]    = useState(false);
  const [isHistoryOpen,    setIsHistoryOpen]    = useState(false);
  const [selectedRoom,     setSelectedRoom]     = useState("Luxzy Room");
  const [selectedRoomId,   setSelectedRoomId]   = useState("N01");
  const [selectedCheckIn,  setSelectedCheckIn]  = useState("");
  const [selectedCheckOut, setSelectedCheckOut] = useState("");

  const rooms = [
    { id: "N01", name: "Luxzy Room",  price: "500,000", img: "/room.png" },
    { id: "N02", name: "Cenima Room", price: "700,000", img: "/room.png" },
    { id: "N03", name: "Luxzy Room",  price: "500,000", img: "/room.png" },
    { id: "N04", name: "Cenima Room", price: "700,000", img: "/room.png" },
  ];

  return (
    <main className="min-h-screen bg-white font-lao overflow-x-hidden">
      {/* Hero */}
      <section className="relative h-[450px] w-full text-white">
        <div className="absolute inset-0 z-0">
          <Image src="/pic.png" alt="Resort" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-black/25" />
        </div>

        <nav className="relative z-20 flex justify-end p-5 container mx-auto gap-2">
          <button className="bg-slate-900/80 px-4 py-1.5 rounded-lg flex items-center gap-2 text-[12px] border border-white/20">
            {status === "loading" ? "..." : session?.user?.name ?? "Guest"}
            <User size={14} />
          </button>
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-red-600/80 px-4 py-1.5 rounded-lg flex items-center gap-2 text-[12px] border border-white/20 hover:bg-red-700/80 transition-all active:scale-95"
            >
              ອອກ <LogOut size={14} />
            </button>
          )}
        </nav>

        <div className="relative z-20 container mx-auto px-6 mt-12">
          <h1 className="text-5xl font-bold leading-tight drop-shadow-lg">
            Resort Mai Son De <br /> Nong Khiw
          </h1>
        </div>

        {/* Search Bar */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-30 w-full max-w-6xl px-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 flex flex-wrap items-end gap-4 text-gray-700 border border-gray-100">
            <div className="flex-1 min-w-[150px]">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase">ຫ້ອງ</p>
              <select
                value={selectedRoom}
                onChange={(e) => {
                  setSelectedRoom(e.target.value);
                  const found = rooms.find((r) => r.name === e.target.value);
                  if (found) setSelectedRoomId(found.id);
                }}
                className="w-full p-2.5 border rounded-lg text-[13px] bg-gray-50 outline-none"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase">ວັນທີເຂົ້າພັກ</p>
              <input type="date" value={selectedCheckIn} onChange={(e) => setSelectedCheckIn(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-[13px] bg-gray-50 outline-none" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase">ວັນທີສິ້ນສຸດ</p>
              <input type="date" value={selectedCheckOut} onChange={(e) => setSelectedCheckOut(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-[13px] bg-gray-50 outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsBookingOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-[13px] font-bold shadow-md shadow-blue-100 transition-all active:scale-95">
                ຈອງຫ້ອງ
              </button>
              <button onClick={() => setIsHistoryOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all active:scale-95">
                ປະຫວັດການຈອງ
              </button>
            </div>
            <div className="relative flex-[1.2] min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="ຄົ້ນຫາ..."
                className="w-full p-2.5 pl-10 border rounded-lg bg-gray-50 text-[13px] outline-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Rooms */}
      <section className="container mx-auto px-6 pt-32 pb-20">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-1.5 h-8 bg-gray-800 rounded-full" />
          <h2 className="text-4xl font-bold text-gray-800">ຫ້ອງ</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="relative h-52 w-full overflow-hidden">
                <Image src={room.img} alt={room.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                <button className="absolute top-4 right-4 text-white/80 hover:text-white">
                  <Bookmark size={22} fill="currentColor" />
                </button>
              </div>
              <div className="p-6">
                <h3 className="text-[18px] font-bold text-gray-800">{room.name}</h3>
                <div className="flex justify-between items-end mt-6">
                  <div className="font-bold text-gray-900">
                    <span className="text-[14px] font-sans">$</span>{" "}
                    <span className="text-2xl font-sans">{room.price}</span>{" "}
                    <span className="text-[12px] text-gray-500 font-normal">ກີບ</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[12px] bg-gray-50 px-2 py-1 rounded-md">
                    <Bed size={16} /> {room.id}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedRoom(room.name);
                    setSelectedRoomId(room.id);
                    setIsBookingOpen(true);
                  }}
                  className="w-full mt-6 py-2.5 border-2 border-gray-800 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-800 hover:text-white transition-all active:scale-95"
                >
                  ເບິ່ງຂໍ້ມູນທັງໝົດ
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        roomType={selectedRoom}
        roomId={selectedRoomId}
        checkIn={selectedCheckIn}
        checkOut={selectedCheckOut}
      />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </main>
  );
}