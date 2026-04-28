"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Bed, User } from "lucide-react";

export default function Home() {
  const [selectedRoom, setSelectedRoom] = useState("");

  const rooms = [
    { id: "N01", name: "Luxzy Room",  price: "500,000", img: "/room.png" },
    { id: "N02", name: "Cenima Room", price: "700,000", img: "/room.png" },
    { id: "N03", name: "Luxzy Room",  price: "500,000", img: "/room.png" },
    { id: "N04", name: "Cenima Room", price: "700,000", img: "/room.png" },
  ];

  return (
    <main className="min-h-screen bg-white font-lao">
      {/* Hero Section */}
      <section className="relative h-[400px] w-full text-white">
        <div className="absolute inset-0 z-0">
          <Image src="/pic.png" alt="BG" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-black/25" />
        </div>

        {/* Navbar */}
        <nav className="relative z-50 flex justify-end p-3 container mx-auto">
          <div className="relative group">
            <button className="bg-slate-900/80 hover:bg-slate-800 px-4 py-1.5 rounded-md flex items-center gap-2 text-[11px] border border-white/20 transition-all">
              Sign In <User size={12} />
            </button>
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
              <Link href="/login" className="block px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium">
                Login
              </Link>
              <div className="h-[1px] bg-gray-100 mx-2 my-1" />
              <Link href="/register" className="block px-4 py-2 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium">
                Sign Up
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative z-20 container mx-auto px-6 mt-8">
          <h1 className="text-4xl font-bold leading-tight">
            Resort Mai Son De <br /> Nong Khiw
          </h1>
        </div>

        {/* Search Bar */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-4">
          <div className="bg-white rounded-lg shadow-lg p-3 flex flex-wrap items-end gap-3 text-gray-700 border border-gray-100">

            {/* ✅ ເລືອກຫ້ອງ */}
            <div className="flex-1 min-w-[120px]">
              <p className="text-[8px] font-bold text-gray-400 mb-0.5 uppercase">ຈອງຫ້ອງ</p>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full p-1 border-b text-[11px] bg-transparent outline-none cursor-pointer"
              >
                <option value="">ເລືອກຫ້ອງ</option>
                <option value="Luxzy Room">Luxzy Room</option>
                <option value="Cenima Room">Cenima Room</option>
              </select>
            </div>

            <div className="flex-1 min-w-[100px]">
              <p className="text-[8px] text-gray-400 mb-0.5">ວັນທີເຂົ້າພັກ</p>
              <input type="date" className="w-full p-1 border-b text-[11px] outline-none" />
            </div>
            <div className="flex-1 min-w-[100px]">
              <p className="text-[8px] text-gray-400 mb-0.5">ວັນທີເຊັກເອົາ</p>
              <input type="date" className="w-full p-1 border-b text-[11px] outline-none" />
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-[11px] transition-all active:scale-95">
              ຈອງຫ້ອງ
            </button>

            <div className="relative flex-1 min-w-[130px]">
              <Search className="absolute left-2 bottom-2 text-gray-400" size={12} />
              <input type="text" placeholder="ຄົ້ນຫາ" className="w-full p-1.5 pl-7 border rounded-md bg-gray-50 text-[11px] outline-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Room List */}
      <section className="container mx-auto px-6 pt-16 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-black" />
          <h2 className="text-2xl font-bold">ຫ້ອງ</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
              <div className="relative h-40 w-full overflow-hidden">
                <Image src={room.img} alt={room.name} fill className="object-cover" />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-gray-800">{room.name}</h3>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-[13px] font-bold text-blue-600">{room.price} ກີບ</div>
                  <div className="flex items-center gap-1 text-gray-400 text-[10px]">
                    <Bed size={12} /><span>{room.id}</span>
                  </div>
                </div>
                {/* ✅ ກົດ Card ກໍ set ຫ້ອງນັ້ນ */}
                <button
                  onClick={() => setSelectedRoom(room.name)}
                  className="w-full mt-3 py-1 border border-gray-200 rounded-md text-[10px] font-bold hover:bg-gray-900 hover:text-white transition-all"
                >
                  ເບິ່ງຂໍ້ມູນ
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}