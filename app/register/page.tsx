"use client"

import Image from "next/image"
import Link  from "next/link"
import { X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function RegisterPage() {
  const router = useRouter()

  const [name,     setName]     = useState("")
  const [lastName, setLastName] = useState("")
  const [phone,    setPhone]    = useState("")
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    // ── Client-side validation ─────────────────────────────────────
    if (!name || !lastName || !phone || !email || !password) {
      setError("ກະລຸນາກອກຂໍ້ມູນໃຫ້ຄົບທຸກຊ່ອງ")
      return
    }
    if (password.length < 6) {
      setError("Password ຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວ")
      return
    }

    try {
      setLoading(true)

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lastName, phone, email, password }),
      })

      // ── Safe JSON parse ─────────────────────────────────────────
      // ป้องกัน กรณี server return HTML แทน JSON
      const contentType = response.headers.get("content-type") ?? ""
      let data: { message?: string } = {}

      if (contentType.includes("application/json")) {
        data = await response.json()
      } else {
        // Server ส่ง HTML error กลับมา (500/404) — แสดง error สั้น
        data = { message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ (HTTP " + response.status + ")" }
      }

      if (!response.ok) {
        setError(data.message ?? "ສະໝັກບໍ່ສຳເລັດ")
        return
      }

      router.push("/login?registered=1")

    } catch (err) {
      // Network error — ไม่สามารถ reach server ได้เลย
      console.error("[REGISTER_CLIENT_ERROR]", err)
      setError("ບໍ່ສາມາດເຊື່ອມຕໍ່ Server ໄດ້ ກະລຸນາກວດ Network")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center relative font-lao">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="/pic.png" alt="Background" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      </div>

      {/* Card */}
      <div className="relative z-10 bg-[#1a1a1a] text-white w-full max-w-[420px] p-10 py-10 rounded-[40px] shadow-2xl border border-white/10 text-center">

        <Link href="/" className="absolute top-8 right-8 text-gray-500 hover:text-white">
          <X size={20} />
        </Link>

        <h1 className="text-3xl font-bold mb-2">ລົງທະບຽນ</h1>
        <p className="text-gray-400 text-sm mb-8">ກະລຸນາປ້ອນຂໍ້ມູນ</p>

        <form onSubmit={handleRegister} className="space-y-5">
          <input
            type="text" placeholder="Name" autoComplete="given-name"
            value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm"
            required
          />
          <input
            type="text" placeholder="Last name" autoComplete="family-name"
            value={lastName} onChange={(e) => setLastName(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm"
            required
          />
          <input
            type="tel" placeholder="Phone number" autoComplete="tel"
            value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm"
            required
          />
          <input
            type="email" placeholder="Email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm"
            required
          />
          <input
            type="password" placeholder="Password (ຢ່າງໜ້ອຍ 6 ຕົວ)" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm"
            required
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5da2d5] hover:bg-[#4a8ebf] disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-xl mt-4 transition-all shadow-lg active:scale-95"
          >
            {loading ? "ກຳລັງໂຫລດ..." : "ຢືນຢັນ"}
          </button>
        </form>

        <p className="text-gray-400 text-xs mt-6">
          ມີບັນຊີແລ້ວບໍ?{" "}
          <Link href="/login" className="text-blue-500 hover:underline ml-1">
            ເຂົ້າສູ່ລະບົບ
          </Link>
        </p>
      </div>
    </main>
  )
}