import { test as setup, loginAs } from "./helpers"
import fs from "fs"
import path from "path"

const AUTH_DIR = path.join(__dirname, ".auth")
fs.mkdirSync(AUTH_DIR, { recursive: true })

// login ครั้งเดียวต่อ role แล้วเก็บ session ไว้ reuse — กัน rate-limit ต่อ email
setup("authenticate superadmin", async ({ page }) => {
  await loginAs(page, "superadmin")
  await page.context().storageState({ path: path.join(AUTH_DIR, "super.json") })
})

setup("authenticate admin", async ({ page }) => {
  await loginAs(page, "admin")
  await page.context().storageState({ path: path.join(AUTH_DIR, "admin.json") })
})
