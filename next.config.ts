import type { NextConfig } from "next";

// ── Security headers ใช้กับทุก response (BUG-009) ─────────────────────
const securityHeaders = [
  // บังคับ HTTPS (มีผลเฉพาะตอน serve ผ่าน HTTPS; dev ผ่าน http ไม่กระทบ)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // กัน clickjacking — ห้ามฝังในเว็บอื่น
  { key: "X-Frame-Options", value: "DENY" },
  // ห้ามเบราว์เซอร์เดา MIME (กัน sniffing โจมตี)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // ลดข้อมูล referrer ที่รั่วไปเว็บอื่น
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // ปิด API เบราว์เซอร์ที่ไม่ได้ใช้
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
        search: "?w=800&q=80",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
