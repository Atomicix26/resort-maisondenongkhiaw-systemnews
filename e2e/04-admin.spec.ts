import { test, expect, shot, trackErrors } from "./helpers"
import path from "path"

const SUPER_STATE = path.join(__dirname, ".auth", "super.json")
const ADMIN_STATE = path.join(__dirname, ".auth", "admin.json")

// console error ที่ไม่เกี่ยวกับบั๊กจริง (asset 404 / ResizeObserver)
function realErrors(errs: string[]) {
  return errs.filter((e) => !/favicon|ResizeObserver|404 \(Not Found\)|\.(png|jpg|jpeg|webp|svg)\b/i.test(e))
}

// หน้า superadmin ที่ render อยู่กับที่ (ไม่ redirect)
const SUPER_PAGES = [
  { path: "/superadmin/dashboard",    name: "dashboard" },
  { path: "/superadmin/logs",         name: "logs" },
  { path: "/superadmin/reports",      name: "reports" },
  { path: "/superadmin/price-config", name: "price-config" },
  { path: "/superadmin/room-types",   name: "room-types" },
]

test.describe("Superadmin pages", () => {
  test.use({ storageState: SUPER_STATE })

  for (const p of SUPER_PAGES) {
    test(`renders ${p.path}`, async ({ page }) => {
      const errs = trackErrors(page)
      await page.goto(p.path)
      await page.waitForLoadState("networkidle")
      expect(page.url(), `redirected away from ${p.path}`).toContain(p.path)
      await shot(page, `04-super-${p.name}`)
      const real = realErrors(errs)
      expect(real, real.join("\n")).toHaveLength(0)
    })
  }

  // /superadmin/rooms เป็น stub redirect → /booking (จัดการห้องอยู่ที่นั่น)
  test("/superadmin/rooms redirects to /booking room table", async ({ page }) => {
    await page.goto("/superadmin/rooms")
    await expect(page.getByText(/ຈັດການຂໍ້ມູນຫ້ອງ/)).toBeVisible({ timeout: 20_000 })
    expect(page.url()).toContain("/booking")
    await shot(page, "04-super-rooms-booking")
  })

  // /superadmin/users เป็น stub redirect → dashboard (จัดการ user ฝังในหน้า dashboard)
  test("/superadmin/users redirects to dashboard", async ({ page }) => {
    await page.goto("/superadmin/users")
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("/superadmin/dashboard")
    await shot(page, "04-super-users-redirect")
  })

  // /booking = หน้าจัดการห้องสำหรับ SUPERADMIN
  test("superadmin can manage rooms at /booking", async ({ page }) => {
    await page.goto("/booking")
    await expect(page.getByText(/ຈັດການຂໍ້ມູນຫ້ອງ/)).toBeVisible({ timeout: 20_000 })
    await shot(page, "04-super-booking")
  })
})

test.describe("Admin pages", () => {
  test.use({ storageState: ADMIN_STATE })

  test("admin dashboard renders", async ({ page }) => {
    const errs = trackErrors(page)
    await page.goto("/admin/dashboard")
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("/admin/dashboard")
    await shot(page, "04-admin-dashboard")
    const real = realErrors(errs)
    expect(real, real.join("\n")).toHaveLength(0)
  })

  test("admin room-status page renders", async ({ page }) => {
    await page.goto("/admin/room-status")
    await page.waitForLoadState("networkidle")
    await shot(page, "04-admin-room-status")
    expect(page.url()).toContain("/admin/room-status")
  })

  // RBAC: /booking สงวนไว้ให้ SUPERADMIN — ADMIN ต้องถูกเด้งออก (FIX #6)
  test("RBAC: admin is blocked from /booking", async ({ page }) => {
    await page.goto("/booking")
    await page.waitForLoadState("networkidle")
    await shot(page, "04-admin-booking-blocked")
    expect(page.url()).not.toContain("/booking")
  })
})
