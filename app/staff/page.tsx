import { redirect } from "next/navigation"

// Staff management belongs to the SuperAdmin zone (the /api/staff routes are
// SUPERADMIN-only). Keep this path working by sending it to the canonical page.
export default function StaffRedirectPage() {
  redirect("/superadmin/staff")
}
