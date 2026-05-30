"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { ShieldX } from "lucide-react"

export default function UnauthorizedPage() {
  const { data: session } = useSession()

  const backHref =
    session?.user?.role === "SUPERADMIN" ? "/superadmin/dashboard" :
    session?.user?.role === "ADMIN"      ? "/admin/dashboard" :
                                           "/profile"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-lao">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-5">
          <ShieldX size={38} className="text-red-500" />
        </div>
        <h1 className="text-[22px] font-bold text-gray-900 mb-2">ບໍ່ມີສິດເຂົ້າໃຊ້</h1>
        <p className="text-gray-400 text-[13px] mb-7">ທ່ານບໍ່ມີສິດເຂົ້າໃຊ້ໜ້ານີ້</p>
        <Link href={backHref}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all">
          ກັບສູ່ໜ້າຫຼັກ
        </Link>
      </div>
    </div>
  )
}