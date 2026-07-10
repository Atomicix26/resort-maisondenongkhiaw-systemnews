import { test, expect, loginAs, shot, CREDS } from "./helpers"

// อีเมลใหม่ไม่ซ้ำต่อรอบรัน — เก็บไว้ใช้ใน booking spec ด้วยผ่าน env ไม่ได้,
// แต่ละ spec มีไฟล์ของตัวเอง จึง register ซ้ำใน booking spec อีกที
const ts = Date.now()
const NEW_EMAIL = `qa_${ts}@test.com`

test.describe("Auth & RBAC", () => {
  test("register a new user → redirected to login", async ({ page }) => {
    await page.goto("/register")
    await page.fill('input[autocomplete="given-name"]', "QA")
    await page.fill('input[autocomplete="family-name"]', "Tester")
    await page.fill('input[type="tel"]', "0201234567")
    await page.fill('input[type="email"]', NEW_EMAIL)
    await page.fill('input[type="password"]', "qatest1234")
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    await shot(page, "02-registered")
    expect(page.url()).toContain("/login")
  })

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[type="email"]', CREDS.user.email)
    await page.fill('input[type="password"]', "wrong-password")
    await page.click('button[type="submit"]')
    await expect(page.getByText(/ບໍ່ຖືກຕ້ອງ/)).toBeVisible({ timeout: 15_000 })
    await shot(page, "02-login-bad")
    expect(page.url()).toContain("/login")
  })

  test("user login → /profile", async ({ page }) => {
    await loginAs(page, "user")
    expect(page.url()).toContain("/profile")
    await shot(page, "02-user-profile")
  })

  test("admin login → /admin/dashboard", async ({ page }) => {
    await loginAs(page, "admin")
    expect(page.url()).toContain("/admin/dashboard")
    await shot(page, "02-admin-dashboard")
  })

  test("superadmin login → /superadmin/dashboard", async ({ page }) => {
    await loginAs(page, "superadmin")
    expect(page.url()).toContain("/superadmin/dashboard")
    await shot(page, "02-superadmin-dashboard")
  })

  test("RBAC: USER visiting /superadmin/users is denied", async ({ page }) => {
    await loginAs(page, "user")
    await page.goto("/superadmin/users")
    // middleware ควรเด้งออกจากหน้า superadmin (ไป login / unauthorized / profile)
    await page.waitForLoadState("networkidle")
    await shot(page, "02-rbac-user-blocked")
    expect(page.url()).not.toContain("/superadmin/users")
  })
})
