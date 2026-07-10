import { test as base, Page, expect } from "@playwright/test"
import fs from "fs"
import path from "path"

// ── แต่ละ context ได้ IP ปลอมไม่ซ้ำ ─────────────────────────────────
// dev mode มองทุก request เป็น IP "unknown" เดียว → login rate-limit
// (10 ครั้ง/15 นาที ต่อ IP) สะสมข้ามเทสจนเต็ม. จำลองคนละเครื่องด้วย
// x-forwarded-for ที่ไม่ซ้ำ เพื่อให้แต่ละเทสมีโควตาของตัวเอง
let ipCounter = 1
export const test = base.extend({
  context: async ({ context }, run) => {
    ipCounter++
    const a = Math.floor(ipCounter / 254) % 254
    const b = ipCounter % 254
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.20.${a}.${b + 1}` })
    await run(context)
  },
})

export const SHOTS = path.join(__dirname, "shots")
fs.mkdirSync(SHOTS, { recursive: true })

// ── seed credentials ────────────────────────────────────────────────
export const CREDS = {
  superadmin: { email: "superadmin@resort.com", password: "superadmin1234", home: "/superadmin/dashboard" },
  admin:      { email: "admin@resort.com",      password: "admin1234",      home: "/admin/dashboard" },
  staff:      { email: "mali@resort.com",       password: "staff1234",      home: "/admin/dashboard" },
  user:       { email: "user@test.com",         password: "user1234",       home: "/profile" },
}

// เก็บ console error / pageerror ของแต่ละหน้า เพื่อรายงาน UI glitch
export function trackErrors(page: Page): string[] {
  const errs: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(`console: ${m.text()}`)
  })
  page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`))
  return errs
}

// ถ่าย screenshot เต็มหน้า ลงโฟลเดอร์ e2e/shots
export async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true })
}

// login ผ่าน UI จริง (NextAuth credentials) แล้วรอ redirect ตาม role
export async function loginAs(page: Page, who: keyof typeof CREDS) {
  const c = CREDS[who]
  await page.goto("/login")
  await page.fill('input[type="email"]', c.email)
  await page.fill('input[type="password"]', c.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`**${c.home}`, { timeout: 20_000 })
}

// วันที่ในอนาคต (YYYY-MM-DD) เลื่อนจากวันนี้ N วัน
export function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split("T")[0]
}

export { expect }
