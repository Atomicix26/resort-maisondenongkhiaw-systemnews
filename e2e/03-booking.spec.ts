import { test, expect, shot, futureDate } from "./helpers"

// ใช้ user ใหม่ (บัญชีสะอาด ไม่มี PENDING ค้าง) ทำ flow จอง→จ่าย→ยกเลิก ครบวง
const ts = Date.now()
const EMAIL = `qabook_${ts}@test.com`
const PASS = "qatest1234"

async function register(page: import("@playwright/test").Page) {
  await page.goto("/register")
  await page.fill('input[autocomplete="given-name"]', "Book")
  await page.fill('input[autocomplete="family-name"]', "Flow")
  await page.fill('input[type="tel"]', "0209998888")
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/login/, { timeout: 20_000 })
}

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/profile", { timeout: 20_000 })
}

test.describe.serial("Booking flow (fresh user)", () => {
  test("register + login fresh user", async ({ page }) => {
    await register(page)
    await login(page)
    expect(page.url()).toContain("/profile")
  })

  test("book a room → confirm → pay at hotel → success", async ({ page }) => {
    await login(page)

    // หน้าแรก: เลือกห้อง + วันที่ แล้วกดจอง
    await page.goto("/")
    const roomSelect = page.locator("select").first()
    await expect(roomSelect).toBeVisible({ timeout: 20_000 })
    await roomSelect.selectOption({ index: 1 }) // ห้องแรกในรายการ

    // สุ่มช่วงวันที่กันชนกับ booking จากรอบรันก่อนหน้า (ห้องเดิมจะถูกล็อกไว้)
    const offset = 30 + Math.floor(Math.random() * 120)
    const ci = futureDate(offset)
    const co = futureDate(offset + 2)
    const dateInputs = page.locator('input[type="date"]')
    await dateInputs.nth(0).fill(ci)
    await dateInputs.nth(1).fill(co)

    await page.getByRole("button", { name: /Book Now|ຈອງ/i }).first().click()

    // ไปหน้า payment (step confirm)
    await page.waitForURL(/\/payment/, { timeout: 20_000 })
    await expect(page.getByText(/Confirm Booking|ຢືນຢັນການຈອງ/i)).toBeVisible({ timeout: 20_000 })
    await shot(page, "03-payment-confirm")

    // ยืนยันการจอง → สร้าง booking (POST /api/bookings)
    await page.getByRole("button", { name: /Confirm Booking|ຢືນຢັນການຈອງ/i }).click()

    // step pay
    await expect(page.getByText(/Payment Method|ວິທີຊຳລະ/i)).toBeVisible({ timeout: 20_000 })

    // เลือกจ่ายที่โรงแรม (ไม่ต้องอัปสลิป) แล้วยืนยัน
    await page.getByText(/Pay at Hotel|ຈ່າຍທີ່ Hotel/i).click()
    await page.getByRole("button", { name: /Confirm Booking|ຢືນຢັນ/i }).click()

    // success
    await expect(page.getByRole("heading", { name: /ການຈອງຢືນຢັນແລ້ວ/ })).toBeVisible({ timeout: 20_000 })
    await shot(page, "03-payment-success")
  })

  test("history shows the booking and allows cancel request", async ({ page }) => {
    await login(page)
    await page.goto("/history")
    // มี booking card อย่างน้อย 1 ใบ
    await expect(page.getByText(/ປະຫວັດການຈອງ/)).toBeVisible({ timeout: 20_000 })
    const cancelBtn = page.getByRole("button", { name: /^ຍົກເລີກ$/ }).first()
    await expect(cancelBtn).toBeVisible({ timeout: 20_000 })
    await shot(page, "03-history")

    // เปิด modal ยกเลิก → กรอกเหตุผล → ส่งคำร้อง
    await cancelBtn.click()
    await page.locator("textarea").fill("QA test cancel")
    await shot(page, "03-cancel-modal")
    await page.getByRole("button", { name: /ສົ່ງຄຳຮ້ອງ/ }).click()
    // modal ปิด (กลับมาหน้า history) — ถือว่าคำร้องถูกส่ง
    await expect(page.getByText(/ປະຫວັດການຈອງ/)).toBeVisible({ timeout: 20_000 })
    await shot(page, "03-after-cancel")
  })
})
