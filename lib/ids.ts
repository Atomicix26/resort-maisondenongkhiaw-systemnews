// ── ออก id แบบ <PREFIX>-<YYYYMMDD>-<สุ่ม4> เช่น BK-20260703-A8X3 ──────────────
// prefix บอกประเภท (BK=booking, ...) · วันที่ช่วยให้ staff รู้ช่วงเวลา · ส่วนท้ายสุ่ม 4 ตัว
// ไม่มีตัวนับกลาง (ไม่แตะ DB): ส่วนสุ่ม (36^4 ≈ 1.68 ล้าน ต่อ prefix/วัน) กันชนกันเอง
// ถ้าซ้ำ (โอกาสต่ำมากสำหรับ workload ระดับรีสอร์ท) การ insert จะ error unique constraint

export const ID_PREFIX = {
  user:               "US",
  staff:              "STF",
  roomType:           "RT",
  room:               "RM",
  priceConfig:        "PC",
  booking:            "BK",
  paymentTransaction: "PAY",
  bookApproval:       "APV",
  checkInLog:         "CIN",
  checkOutLog:        "COT",
  cancelRequest:      "CXL",
  review:             "RV",
  reviewManage:       "RVM",
  statusRoom:         "SRM",
  accessLog:          "LOG",
} as const

export type IdEntity = keyof typeof ID_PREFIX

const SUFFIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

function ymd(d: Date): string {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

function randomSuffix(len = 4): string {
  const bytes = new Uint8Array(len)
  globalThis.crypto.getRandomValues(bytes)
  let out = ""
  for (let i = 0; i < len; i++) out += SUFFIX_CHARS[bytes[i] % SUFFIX_CHARS.length]
  return out
}

// สร้าง id ใหม่ (synchronous) — เรียกตอนสร้างเรคคอร์ด เช่น nextId("booking")
export function nextId(entity: IdEntity, at: Date = new Date()): string {
  return `${ID_PREFIX[entity]}-${ymd(at)}-${randomSuffix()}`
}
