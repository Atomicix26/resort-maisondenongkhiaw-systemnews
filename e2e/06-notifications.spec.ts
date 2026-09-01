import { test, expect, trackErrors } from "./helpers"

test.describe.serial("Live notification flow", () => {
  test("shows a live toast when a notification event is emitted", async ({ page }) => {
    const errors = trackErrors(page)

    await page.goto("/")
    await page.waitForURL("/**")

    // Wait until the page has opened the SSE subscribe connection.
    await page.waitForRequest((request) => request.url().endsWith("/api/notifications/subscribe") && request.method() === "GET")

    await page.evaluate(() => {
      return fetch("/api/notifications/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "booking_update",
          data: { message: "Playwright live notification test" },
        }),
      })
    })

    await expect(page.getByText("Playwright live notification test")).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: "e2e/shots/06-live-notifications.png", fullPage: true })

    expect(errors).toEqual([])
  })
})
