import Image from "next/image";
import Link from "next/link";
import { Search, Bed, User, ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const rooms = [
    { id: "N01", name: "Luxzy Room", price: "500,000", img: "/room.png" },
    { id: "N02", name: "Cenima Room", price: "700,000", img: "/room.png" },
    { id: "N03", name: "Luxzy Room", price: "500,000", img: "/room.png" },
    { id: "N04", name: "Cenima Room", price: "700,000", img: "/room.png" },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* --- Hero Section --- */}
      <section className="relative h-[650px] w-full text-white">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/pic.png" 
            alt="Resort Background" 
            fill 
            className="object-cover"
            priority
          />
        </div>

        {/* Navbar */}
        <nav className="relative z-20 flex justify-end p-6">
          <Link href="/login">
            <button className="bg-slate-900/80 hover:bg-slate-800 px-5 py-2 rounded-lg flex items-center gap-2 text-sm border border-white/20 transition-all">
              Sign In <User size={16} />
            </button>
          </Link>
        </nav>

        {/* Title */}
        <div className="relative z-20 container mx-auto px-12 mt-24">
          <h1 className="text-7xl font-bold leading-tight drop-shadow-2xl">
            Resort Mai Son De <br /> Nong Khiw
          </h1>
        </div>

        {/* Search Bar */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-30 w-full max-w-6xl px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-wrap items-end gap-6 text-gray-700 border border-gray-100">
            <div className="flex-1 min-w-[200px]">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">ຈອງຫ້ອງ</p>
              <select className="w-full p-2 border-b-2 border-gray-100 focus:outline-none focus:border-blue-500 text-sm">
                <option>ເລືອກຫ້ອງ</option>
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">ວັນທີເຂົ້າພັກ</p>
              <input type="date" className="w-full p-2 border-b-2 border-gray-100 focus:outline-none text-sm" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">ວັນທີເຊັກເອົາ</p>
              <input type="date" className="w-full p-2 border-b-2 border-gray-100 focus:outline-none text-sm" />
            </div>
            <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              ປະຫວັດການຈອງ
            </button>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 bottom-3 text-gray-400" size={18} />
              <input type="text" placeholder="ຄົ້ນຫາ" className="w-full p-2.5 pl-10 border rounded-xl bg-gray-50 focus:outline-none text-sm" />
            </div>
          </div>
        </div>
      </section>

      {/* --- Room List Section --- */}
      <section className="container mx-auto px-12 pt-32 pb-20">
        <div className="flex items-center gap-4 mb-12">
           <div className="w-1.5 h-10 bg-black"></div>
           <h2 className="text-5xl font-bold">ຫ້ອງ</h2>
        </div>
        
        <div className="relative group">
          {/* Arrow Buttons (Decorations) */}
          <button className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-black">
            <ChevronLeft size={40} />
          </button>
          <button className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-black">
            <ChevronRight size={40} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all group/card">
                <div className="relative h-60 w-full overflow-hidden">
                  <Image 
                    src={room.img} 
                    alt={room.name}
                    fill
                    className="object-cover group-hover/card:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-lg shadow-sm">
                    <div className="w-4 h-4 bg-black rounded-sm"></div>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-800">{room.name}</h3>
                  <div className="flex justify-between items-center mt-5">
                    <div className="text-lg font-black text-gray-900">
                      $ {room.price} ກີບ
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                      <Bed size={20} className="text-gray-400" />
                      <span>{room.id}</span>
                    </div>
                  </div>
                  <button className="w-full mt-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all">
                    ເບິ່ງຂໍ້ມູນທັງໝົດ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}