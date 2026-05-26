"use client"

import Image    from "next/image"
import Link     from "next/link"
import { useState }                from "react"
import { signIn, getSession }      from "next-auth/react"
import { useRouter }               from "next/navigation"
import { getRedirectByRole }       from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Email ຫຼື Password ບໍ່ຖືກຕ້ອງ")
      return
    }

    // ดึง session เพื่อรู้ role แล้ว redirect ไปถูกที่
    const session = await getSession()
    const role    = session?.user?.role ?? "USER"
    router.push(getRedirectByRole(role))
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center relative font-lao">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="/pic.png" alt="Background" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      </div>

      {/* Card */}
      <div className="relative z-10 bg-[#1a1a1a] text-white w-full max-w-[400px] p-10 py-16 rounded-[45px] shadow-2xl border border-white/5 text-center">

        <h1 className="text-4xl font-bold mb-2">ເຂົ້າສູ່ລະບົບ</h1>
        <p className="text-gray-400 text-sm mb-10">ກະລຸນາປ້ອນຂໍ້ມູນ</p>

        <form onSubmit={handleLogin} className="space-y-8">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm"
            required
          />

          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border-b border-gray-600 py-2 focus:outline-none text-sm"
            required
          />

          {error && (
            <p className="text-red-400 text-sm -mt-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-full hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "ກຳລັງເຂົ້າສູ່ລະບົບ..." : "ເຂົ້າສູ່ລະບົບ"}
          </button>
        </form>

        <p className="text-gray-500 text-xs mt-8">
          ຍັງບໍ່ມີບັນຊີ?{" "}
          <Link href="/register" className="text-white underline hover:text-gray-200">
            ສະໝັກໃຊ້
          </Link>
        </p>
      </div>
    </main>
  )
}