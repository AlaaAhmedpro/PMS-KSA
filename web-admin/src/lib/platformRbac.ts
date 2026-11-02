import type { RoleId } from "./types";
import type { PlatformRoleId } from "./platformDomain";

export type PlatformPermission =
  | "overview"
  | "organizations"
  | "organizations.write"
  | "platform_users"
  | "support"
  | "plans"
  | "plans.write"
  | "subscriptions"
  | "billing"
  | "billing.write"
  | "analytics"
  | "leads"
  | "leads.write"
  | "monitoring"
  | "audit"
  | "settings"
  | "settings.write";

const ALL: PlatformPermission[] = [
  "overview",
  "organizations",
  "organizations.write",
  "platform_users",
  "support",
  "plans",
  "plans.write",
  "subscriptions",
  "billing",
  "billing.write",
  "analytics",
  "leads",
  "leads.write",
  "monitoring",
  "audit",
  "settings",
  "settings.write",
];

const ROLE_PERMS: Record<PlatformRoleId, PlatformPermission[]> = {
  super_admin: ALL,
  platform_admin: ALL.filter((p) => p !== "settings.write").concat(["settings.write"]),
  finance_admin: [
    "overview",
    "organizations",
    "plans",
    "subscriptions",
    "billing",
    "billing.write",
    "analytics",
    "audit",
  ],
  support_agent: [
    "overview",
    "organizations",
    "support",
    "leads",
    "leads.write",
  ],
  readonly_admin: [
    "overview",
    "organizations",
    "plans",
    "subscriptions",
    "billing",
    "analytics",
    "leads",
    "support",
    "monitoring",
    "audit",
    "settings",
  ],
};

export function normalizePlatformRole(role: RoleId | string): PlatformRoleId {
  if (
    role === "super_admin" ||
    role === "platform_admin" ||
    role === "finance_admin" ||
    role === "support_agent" ||
    role === "readonly_admin"
  ) {
    return role;
  }
  return "platform_admin";
}

export function can(role: RoleId | string | undefined, perm: PlatformPermission): boolean {
  const r = normalizePlatformRole(role || "readonly_admin");
  return ROLE_PERMS[r].includes(perm);
}
