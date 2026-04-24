import Image from "next/image";
import Link from "next/link";
import { User, X } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* 1. ຮູບພື້ນຫຼັງທີ່ເບີ (Blur Background) */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/pic.png" 
          alt="Background" 
          fill 
          className="object-cover"
        />
        {/* ຊັ້ນສີດຳຈາງໆ ແລະ ເຮັດໃຫ້ເບີ */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      </div>

      {/* 2. ປຸ່ມ Sign In ມຸມຂວາເທິງ (ຕາມຮູບຕົວຢ່າງ) */}
      <div className="absolute top-6 right-10 z-20">
        <button className="bg-slate-700/80 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-bold border border-white/20">
          Sign In <User size={18} />
        </button>
      </div>

      {/* 3. ກ່ອງ Login (Login Card) */}
      <div className="relative z-10 bg-[#1a1a1a] text-white w-full max-w-[400px] p-10 py-16 rounded-[45px] shadow-2xl border border-white/5">
        
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-2">ເຂົ້າສູ່ລະບົບ</h2>
          <p className="text-gray-400 text-sm">ກະະລຸນາປ້ອນຂໍ້ມູນ</p>
        </div>

        <form className="space-y-10">
          {/* Email / Phone */}
          <div className="relative border-b border-gray-600">
            <input 
              type="text" 
              placeholder="Email or phone number" 
              className="w-full bg-transparent py-2 focus:outline-none placeholder:text-gray-500 text-sm"
            />
          </div>

          {/* Password */}
          <div className="relative border-b border-gray-600">
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-transparent py-2 focus:outline-none placeholder:text-gray-500 text-sm"
            />
          </div>

          {/* Retype Password */}
          <div className="relative border-b border-gray-600">
            <input 
              type="password" 
              placeholder="Retype password" 
              className="w-full bg-transparent py-2 focus:outline-none placeholder:text-gray-500 text-sm"
            />
          </div>
          
          {/* ປຸ່ມເຂົ້າສູ່ລະບົບ */}
          <button className="w-full bg-[#5294e2] hover:bg-blue-600 text-white font-bold py-4 rounded-2xl mt-4 transition-all text-xl shadow-lg active:scale-95">
            ເຂົ້າສູ່ລະບົບ
          </button>

          {/* ລົງທະບຽນ */}
          <p className="text-center text-xs text-gray-400 mt-6">
            ທ່ານບໍ່ທັນໄດ້ລົງທະບຽນບໍ? <Link href="#" className="text-blue-500 hover:underline">ລົງທະບຽນ</Link>
          </p>
        </form>

        {/* ປຸ່ມປິດ (X) ເພື່ອກັບຄືນໜ້າຫຼັກ */}
        <Link href="/" className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </Link>
      </div>
    </main>
  );
}