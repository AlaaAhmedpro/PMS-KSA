import type {
  OrganizationStatus,
  PlatformOrganization,
  SubscriptionStatus,
} from "./platformDomain";

const ORG_TRANSITIONS: Record<OrganizationStatus, OrganizationStatus[]> = {
  pending: ["provisioning", "archived"],
  provisioning: ["active", "pending", "archived"],
  active: ["suspended", "archived"],
  suspended: ["active", "archived"],
  archived: [],
};

const SUB_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  trial: ["active", "expired", "cancelled"],
  active: ["past_due", "expired", "cancelled"],
  past_due: ["active", "expired", "cancelled"],
  expired: ["active", "cancelled"],
  cancelled: ["active"],
};

export function canTransitionOrg(
  from: OrganizationStatus,
  to: OrganizationStatus,
): boolean {
  if (from === to) return true;
  return ORG_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionSub(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): boolean {
  if (from === to) return true;
  return SUB_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Migrate legacy org.status values that mixed subscription states */
export function migrateLegacyOrgStatus(
  legacy: string,
): { org: OrganizationStatus; preferSub?: SubscriptionStatus } {
  switch (legacy) {
    case "trial":
      return { org: "active", preferSub: "trial" };
    case "expired":
      return { org: "active", preferSub: "expired" };
    case "cancelled":
      return { org: "archived", preferSub: "cancelled" };
    case "provisioning":
      return { org: "provisioning" };
    case "pending":
      return { org: "pending" };
    case "suspended":
      return { org: "suspended" };
    case "archived":
      return { org: "archived" };
    case "active":
    default:
      return { org: "active" };
  }
}

export function migrateLegacySubStatus(legacy: string): SubscriptionStatus {
  if (legacy === "suspended") return "past_due";
  if (
    legacy === "trial" ||
    legacy === "active" ||
    legacy === "past_due" ||
    legacy === "expired" ||
    legacy === "cancelled"
  ) {
    return legacy;
  }
  return "active";
}

export function isExpiringSoon(renewAt?: string, withinDays = 30): boolean {
  if (!renewAt) return false;
  const t = new Date(renewAt).getTime();
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  const max = now + withinDays * 86400000;
  return t >= now && t <= max;
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

/** Normalize legacy/partial org records after domain split */
export function normalizeOrganization(
  raw: PlatformOrganization & { status?: string },
): PlatformOrganization {
  const migrated = migrateLegacyOrgStatus(String(raw.status || "active"));
  const status = (
    ["pending", "provisioning", "active", "suspended", "archived"] as const
  ).includes(raw.status as OrganizationStatus)
    ? (raw.status as OrganizationStatus)
    : migrated.org;

  const digitSeed = raw.id.replace(/\D/g, "") || "1000";
  return {
    ...raw,
    legalName: raw.legalName || raw.name,
    crNumber:
      raw.crNumber ||
      `${raw.customerKind === "government" ? "7" : "1"}${digitSeed.padStart(9, "0").slice(0, 9)}`,
    vatNumber: raw.vatNumber || `3${digitSeed.padStart(14, "0").slice(0, 14)}`,
    nationalAddress:
      raw.nationalAddress ||
      `${raw.city || "الرياض"}، حي العليا، ص.ب ${1000 + Number(digitSeed.slice(-3) || 1)}`,
    accountManagerName: raw.accountManagerName || "لمى سعد القحطاني",
    status,
    provisioningStatus: raw.provisioningStatus || "succeeded",
    customerKind:
      raw.customerKind === "semi_government"
        ? "semi_government"
        : raw.customerKind || "standard",
    settings: raw.settings || {
      language: "ar",
      timezone: "Asia/Riyadh",
      notifyBilling: true,
    },
  };
}
