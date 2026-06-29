import type { Role } from "@prisma/client"

// Allowlist RBAC: list the roles that ARE permitted, never the ones that aren't.
// A denylist (e.g. `role === "USER"`) fails open — any role added in the future
// is granted access by default. These allowlists fail closed instead.
export const ADMIN_ROLES: readonly Role[] = ["ADMIN", "SUPERADMIN"]

/** True when `role` is one of the explicitly-allowed roles. */
export function hasRole(role: string | undefined | null, allowed: readonly Role[]): boolean {
  return role != null && (allowed as readonly string[]).includes(role)
}
