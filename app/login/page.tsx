import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center relative font-lao">
      <div className="absolute inset-0 z-0">
        <Image src="/pic.png" alt="BG" fill className="object-cover" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      </div>

      <div className="relative z-10 bg-[#1a1a1a] text-white w-full max-w-[400px] p-10 py-16 rounded-[45px] shadow-2xl border border-white/5 text-center">
        <h2 className="text-4xl font-bold mb-2">ເຂົ້າສູ່ລະບົບ</h2>
        <p className="text-gray-400 text-sm mb-10">ກະະລຸນາປ້ອນຂໍ້ມູນ</p>

        <form className="space-y-10">
          <input type="text" placeholder="Email or phone number" className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm" />
          <input type="password" placeholder="Password" className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm" />
          <input type="password" placeholder="Retype password" className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm" />
          
          <Link href="/profile" className="block">
            <button type="button" className="w-full bg-[#5294e2] hover:bg-blue-600 text-white font-bold py-4 rounded-2xl mt-4 text-xl shadow-lg transition-all active:scale-95">
              ເຂົ້າສູ່ລະບົບ
            </button>
          </Link>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ທ່ານບໍ່ທັນໄດ້ລົງທະບຽນບໍ? <Link href="/register" className="text-blue-500 hover:underline">ລົງທະບຽນ</Link>
        </p>

        {/* ປຸ່ມ X ກົດກັບໜ້າຫຼັກ */}
        <Link href="/" className="absolute top-8 right-8 text-gray-500 hover:text-white">
          <X size={20} />
        </Link>
      </div>
    </main>
  );
}