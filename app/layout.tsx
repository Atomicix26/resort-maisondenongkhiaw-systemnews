import type { Metadata } from "next"
import Providers from "./providers"
import "./globals.css"
import NotificationToasts from "@/components/notification-toasts"

export const metadata: Metadata = {
  title:       "Resort Maison De Nongkhiaw",
  description: "ລະບົບຈອງຫ້ອງພັກ Resort Maison De Nongkhiaw — ຫ້ອງພັກສວຍງາມທ່າມກາງທຳມະຊາດ",
  keywords:    ["resort", "nong khiaw", "laos", "hotel", "booking", "ນອງຂຽວ"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="lo" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <NotificationToasts />
        </Providers>
      </body>
    </html>
  )
}
