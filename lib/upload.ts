import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

// ── รูปแบบไฟล์รูปที่รองรับ (ใช้ร่วมกันทั้งสลิปชำระเงิน + เอกสารเช็คอิน) ──────────
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export const EXT_MAP = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
} as const

// ── ตรวจชนิดไฟล์จริงจาก magic bytes — ไม่เชื่อ MIME ที่ client ส่งมา (BUG-006) ──
export function sniffImageType(buf: Buffer): keyof typeof EXT_MAP | null {
  if (buf.length < 12) return null

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg"
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png"
  }
  // WEBP: "RIFF" .... "WEBP"
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp"
  }
  // HEIC: กล่อง "ftyp" ที่ offset 4 + brand ที่รองรับ
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"])
    if (HEIC_BRANDS.has(buf.toString("ascii", 8, 12))) return "image/heic"
  }
  return null
}

export type SaveImageResult =
  | { ok: true;  filename: string }
  | { ok: false; error: string }

// ── บันทึกรูปที่อัปโหลด → คืนชื่อไฟล์แบบสุ่ม (เก็บใน private/uploads/<subdir>) ──
// ตรวจขนาด + ชนิดไฟล์จริงจาก magic bytes ก่อนเขียน (ไม่เชื่อ client)
export async function saveImageUpload(
  file: File,
  subdir: string,
  prefix: string,
): Promise<SaveImageResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "ຂະໜາດໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB" }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // ตรวจขนาดจริงซ้ำจาก buffer (size จาก client เชื่อ 100% ไม่ได้)
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return { ok: false, error: "ຂະໜາດໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB" }
  }

  const detectedMime = sniffImageType(buffer)
  if (!detectedMime) {
    return { ok: false, error: "ຮອງຮັບສະເພາະຮູບ JPG, PNG, WEBP, HEIC" }
  }

  const ext      = EXT_MAP[detectedMime]
  const filename = `${prefix}_${crypto.randomBytes(16).toString("hex")}.${ext}`
  const dir      = path.join(process.cwd(), "private", "uploads", subdir)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)

  return { ok: true, filename }
}
