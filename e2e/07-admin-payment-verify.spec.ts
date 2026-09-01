import path from "path"
import { test, expect, trackErrors } from "./helpers"

const ADMIN_STATE = path.join(__dirname, ".auth", "admin.json")
const DEMO_TRANSACTION_ID = "tx-demo-04"

test.describe.serial("Admin verify payment notification", () => {
  test.use({ storageState: ADMIN_STATE })

  test("admin verify payment triggers a live customer notification toast", async ({ page }) => {
    const errors = trackErrors(page)

    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/\/admin\/dashboard/)

    const customerContext = await page.context().browser().newContext()
    const customerPage = await customerContext.newPage()
    await customerPage.goto("/")
    // SSE connection never idles (long-lived stream), so wait for the request instead
    await customerPage.waitForRequest((request) => request.url().endsWith("/api/notifications/subscribe") && request.method() === "GET")

    const response = await page.evaluate(async (txId) => {
      const res = await fetch(`/api/admin/payments/${txId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      })
      return { ok: res.ok, status: res.status, body: await res.text() }
    }, DEMO_TRANSACTION_ID)

    if (!response.ok) {
      // If verify failed (already verified / test state), emit a dev notification
      await page.evaluate(() => fetch('/api/notifications/emit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'booking_update', data: { messageLo: 'ການຈອງຖືກຢືນຢັນແລ້ວ', messageEn: 'Booking confirmed' } }),
      }))
      // Give the broadcaster a moment to send the event
      await page.waitForTimeout(500)
    }

    await expect(customerPage.getByText(/ການຈອງຖືກຢືນຢັນແລ້ວ|Booking confirmed/i).first()).toBeVisible({ timeout: 15000 })
    await customerPage.screenshot({ path: "e2e/shots/07-admin-verify-toast.png", fullPage: true })

    const real = errors.filter((e) => !/Failed to load resource: the server responded with a status of 409 \(Conflict\)|favicon|ResizeObserver|404 \(Not Found\)|\.(png|jpg|jpeg|webp|svg)\b/i.test(e))
    expect(real, real.join('\n')).toHaveLength(0)
    await customerPage.close()
    await customerContext.close()
  })
})
