"use client"

import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    setLoading(false)
    router.push(`/reset-password?email=${encodeURIComponent(email)}`)
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center relative font-lao">
      <div className="absolute inset-0 z-0">
        <Image src="/pic.png" alt="Background" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      </div>

      <div className="relative z-10 bg-[#1a1a1a] text-white w-full max-w-[400px] p-10 py-16 rounded-[45px] shadow-2xl border border-white/5 text-center">
        <h1 className="text-3xl font-bold mb-2">ລືມລະຫັດຜ່ານ</h1>
        <p className="text-gray-500 text-sm mb-10">ປ້ອນອີເມວເພື່ອຮັບ OTP</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-full hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "ກຳລັງສົ່ງ..." : "ສົ່ງ OTP"}
          </button>
        </form>
      </div>
    </main>
  )
}