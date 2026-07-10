import { test, expect, trackErrors, shot } from "./helpers"

// ── หน้าสาธารณะ: ต้อง render ได้ ไม่มี JS error และมีเนื้อหาหลัก ─────────
test.describe("Public pages", () => {
  test("home renders rooms list", async ({ page }) => {
    const errs = trackErrors(page)
    await page.goto("/")
    // ชื่อ resort ใน hero
    await expect(page.getByRole("heading", { name: /Resort Maison/i })).toBeVisible()
    // รอ room cards โหลด (อย่างน้อย 1 ใบ)
    await expect(page.getByRole("button", { name: /Choose this room|ເລືອກຫ້ອງນີ້/i }).first()).toBeVisible({ timeout: 20_000 })
    await shot(page, "01-home")
    expect(errs, errs.join("\n")).toHaveLength(0)
  })

  test("login page renders form", async ({ page }) => {
    const errs = trackErrors(page)
    await page.goto("/login")
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await shot(page, "01-login")
    expect(errs, errs.join("\n")).toHaveLength(0)
  })

  test("register page renders form", async ({ page }) => {
    const errs = trackErrors(page)
    await page.goto("/register")
    await expect(page.locator('input[type="tel"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await shot(page, "01-register")
    expect(errs, errs.join("\n")).toHaveLength(0)
  })
})
