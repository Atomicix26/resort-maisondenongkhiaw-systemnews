import type { Metadata } from "next"
import Providers from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title:       "Resort Mai Son De Nong Khiaw",
  description: "ລະບົບຈອງຫ້ອງພັກ Resort Mai Son De Nong Khiaw — ຫ້ອງພັກສວຍງາມທ່າມກາງທຳມະຊາດ",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
