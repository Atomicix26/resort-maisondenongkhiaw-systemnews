import { redirect } from "next/navigation"

export default function SuperAdminRoomsPage() {
  // SuperAdmin no longer manages rooms/bookings directly — that is the Admin
  // zone's responsibility. Keep this legacy path pointing into its own zone.
  redirect("/superadmin/dashboard")
}
