import { chromium } from "@playwright/test"
import fs from "fs"
import path from "path"

const OUT = "C:/Users/ROG/AppData/Local/Temp/claude/d--resort-MDNK1/1664365d-ec15-4dd4-baa9-ada3b0ed58a3/scratchpad/actual"
fs.mkdirSync(OUT, { recursive: true })
const BASE = "http://localhost:3000"

const CREDS = {
  superadmin: { email: "superadmin@resort.com", password: "superadmin1234" },
  admin:      { email: "admin@resort.com",      password: "admin1234" },
  user:       { email: "user@test.com",         password: "user1234" },
}

let ip = 50
async function newCtx(browser) {
  ip++
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await ctx.setExtraHTTPHeaders({ "x-forwarded-for": `10.30.0.${ip}` })
  return ctx
}

async function login(page, who) {
  const c = CREDS[who]
  await page.goto(BASE + "/login")
  await page.fill('input[type="email"]', c.email)
  await page.fill('input[type="password"]', c.password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)
}

async function snap(page, name, wait = 1500) {
  await page.waitForTimeout(wait)
  await page.screenshot({ path: path.join(OUT, name + ".png") })
  console.log("OK", name, "->", page.url())
}

const browser = await chromium.launch()

// ---- PUBLIC ----
{
  const ctx = await newCtx(browser); const page = await ctx.newPage()
  await page.goto(BASE + "/"); await snap(page, "01_home_out", 2500)
  // try open sign-in modal
  try { await page.click("text=Sign In", { timeout: 4000 }); await snap(page, "03_login_modal", 1200) } catch(e){ console.log("no signin modal", e.message) }
  await page.goto(BASE + "/login"); await snap(page, "03b_login_route")
  await page.goto(BASE + "/register"); await snap(page, "02_register_route")
  await ctx.close()
}

// ---- USER ----
{
  const ctx = await newCtx(browser); const page = await ctx.newPage()
  await login(page, "user")
  await page.goto(BASE + "/"); await snap(page, "04_home_user", 2500)
  // open profile menu
  try { await page.click("text=ໂປຣໄຟລ໌", { timeout:2000 }) } catch {}
  await page.goto(BASE + "/history"); await snap(page, "07_history", 2500)
  await page.goto(BASE + "/profile"); await snap(page, "xx_profile", 2000)
  await page.goto(BASE + "/payment"); await snap(page, "06_payment", 2000)
  await page.goto(BASE + "/booking"); await snap(page, "05_booking_user", 2000)
  await ctx.close()
}

// ---- ADMIN ----
{
  const ctx = await newCtx(browser); const page = await ctx.newPage()
  await login(page, "admin")
  for (const [route,name] of [["/admin/dashboard","09_admin_dashboard"],["/staff","08_staff"],["/admin/room-status","10_room_status"],["/review","11_review"],["/schedule","xx_schedule"],["/booking","05_booking_admin"]]) {
    try { await page.goto(BASE + route); await snap(page, name, 2500) } catch(e){ console.log("FAIL", name, e.message) }
  }
  await ctx.close()
}

// ---- SUPERADMIN ----
{
  const ctx = await newCtx(browser); const page = await ctx.newPage()
  await login(page, "superadmin")
  for (const [route,name] of [
    ["/superadmin/dashboard","12_super_dashboard"],
    ["/superadmin/users","13_users"],
    ["/superadmin/rooms","14_rooms"],
    ["/superadmin/room-types","15_room_types"],
    ["/superadmin/price-config","16_price_config"],
    ["/superadmin/logs","25_logs"],
    ["/superadmin/reports","17_reports_default"],
  ]) {
    try { await page.goto(BASE + route); await snap(page, name, 2800) } catch(e){ console.log("FAIL", name, e.message) }
  }
  await ctx.close()
}

await browser.close()
console.log("DONE")
