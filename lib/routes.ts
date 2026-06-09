export function getRedirectByRole(role: string): string {
  switch (role) {
    case "SUPERADMIN": return "/superadmin/dashboard"
    case "ADMIN":      return "/admin/dashboard"
    default:           return "/profile"
  }
}
