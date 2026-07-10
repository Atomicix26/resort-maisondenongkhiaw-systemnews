"use client"

import Image from "next/image"
import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const params = useSearchParams()
  const email = params.get("email") || ""
  const router = useRouter()

  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    router.push("/login")
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center relative font-lao">
      <div className="absolute inset-0 z-0">
        <Image src="/pic.png" alt="Background" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      </div>

      <div className="relative z-10 bg-[#1a1a1a] text-white w-full max-w-[400px] p-10 py-16 rounded-[45px] shadow-2xl border border-white/5 text-center">
        <h1 className="text-3xl font-bold mb-2">ຢືນຢັນ OTP</h1>
        <p className="text-gray-500 text-sm mb-10">ພວກເຮົາສົ່ງ OTP ໄປທີ່ {email}</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <input
            type="text"
            placeholder="ລະຫັດ OTP (6 ຫຼັກ)"
            value={otp}
            maxLength={6}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm text-center"
            required
          />

          <input
            type="password"
            placeholder="ລະຫັດຜ່ານໃໝ່"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm"
            required
          />

          {error && <p className="text-red-400 text-sm -mt-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-full hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "ກຳລັງດຳເນີນການ..." : "ຢືນຢັນ"}
          </button>
        </form>
      </div>
    </main>
  )
}