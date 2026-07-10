import { test, expect, shot, trackErrors } from "./helpers"

// จอมือถือ (iPhone-ish) — ตรวจ layout ไม่พังบนจอเล็ก
test.use({ viewport: { width: 375, height: 812 } })

test.describe("Responsive (mobile 375px)", () => {
  test("home on mobile", async ({ page }) => {
    const errs = trackErrors(page)
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /Resort Maison/i })).toBeVisible({ timeout: 20_000 })
    // ตรวจไม่มี horizontal scroll (layout ล้นจอ)
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    await shot(page, "05-mobile-home")
    expect(errs, errs.join("\n")).toHaveLength(0)
    expect(overflow, `horizontal overflow ${overflow}px`).toBeLessThanOrEqual(2)
  })

  test("login on mobile", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await shot(page, "05-mobile-login")
  })

  test("register on mobile", async ({ page }) => {
    await page.goto("/register")
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await shot(page, "05-mobile-register")
  })
})
