import { Suspense } from "react"
import PaymentContent from "./_content"

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-lao">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-gray-400">ກຳລັງໂຫລດ...</p>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  )
}