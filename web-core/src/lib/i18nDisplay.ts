import type { PermissionKey } from "./types";
import type { Role } from "./types";

export type TFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

function resolved(key: string, t: TFn): string {
  const value = t(key);
  return value === key ? "" : value;
}

export function roleDisplayName(t: TFn, role: Pick<Role, "id" | "name" | "custom">): string {
  if (role.custom) return role.name;
  return resolved(`role.${role.id}`, t) || role.name;
}

export function roleDescriptionDisplay(
  t: TFn,
  role: Pick<Role, "id" | "description" | "custom">,
): string {
  if (role.custom) return role.description || "";
  return resolved(`role.desc.${role.id}`, t) || role.description || "";
}

export function permissionLabel(t: TFn, key: PermissionKey): string {
  return resolved(`permission.${key}`, t) || key;
}

export function projectStatusLabel(t: TFn, status: string): string {
  return resolved(`project.status.${status}`, t) || status;
}
