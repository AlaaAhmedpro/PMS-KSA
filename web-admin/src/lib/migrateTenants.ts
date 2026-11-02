import type { PlatformTenant } from "./types";
import {
  inferClientType,
  modulesForClientType,
  normalizeOrgModules,
} from "./orgModules";

export function migrateTenant(t: PlatformTenant): PlatformTenant {
  const enabledModules = normalizeOrgModules(
    t.enabledModules ?? modulesForClientType(t.clientType ?? "small"),
  );
  const clientType = inferClientType(enabledModules, t.clientType);
  return { ...t, clientType, enabledModules };
}

export function migrateTenants(list: PlatformTenant[]): PlatformTenant[] {
  return list.map(migrateTenant);
}
