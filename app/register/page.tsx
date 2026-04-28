import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

export default function RegisterPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center relative font-lao">
      <div className="absolute inset-0 z-0">
        <Image src="/pic.png" alt="BG" fill className="object-cover" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      </div>

      <div className="relative z-10 bg-[#1a1a1a] text-white w-full max-w-[420px] p-10 py-10 rounded-[40px] shadow-2xl border border-white/10 text-center">
        <h2 className="text-3xl font-bold mb-2">ລົງທະບຽນ</h2>
        <p className="text-gray-400 text-sm mb-8">ກະະລຸນາປ້ອນຂໍ້ມູນ</p>

        <form className="space-y-5">
          <input type="text" placeholder="Name" className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm" />
          <input type="text" placeholder="Last name" className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm" />
          <input type="text" placeholder="Number" className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm" />
          <input type="email" placeholder="Email" className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm" />
          <input type="password" placeholder="Password" className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm" />

          {/* ແກ້ໄຂຈຸດນີ້: ປ່ຽນຈາກ /login ເປັນ /profile */}
          <Link href="/profile" className="block">
            <button type="button" className="w-full bg-[#5da2d5] hover:bg-[#4a8ebf] text-white font-bold py-4 rounded-2xl text-xl mt-4 transition-all shadow-lg active:scale-95">
              ຢືນຢັນ
            </button>
          </Link>
        </form>

        <p className="text-gray-400 text-xs mt-6">
          ມີບັນຊີແລ້ວບໍ? <Link href="/login" className="text-blue-500 hover:underline">ເຂົ້າສູ່ລະບົບ</Link>
        </p>

        <Link href="/" className="absolute top-8 right-8 text-gray-500 hover:text-white">
          <X size={20} />
        </Link>
      </div>
    </main>
  );
}