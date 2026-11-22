import { CONTENT_EN } from "./contentEn";
import type { Locale } from "./messages";

const ARABIC_RE = /[\u0600-\u06FF]/;

/** Longer phrases first so nested Arabic fragments resolve correctly. */
const CONTENT_EN_KEYS_BY_LEN = Object.keys(CONTENT_EN)
  .filter((k) => k.length >= 2)
  .sort((a, b) => b.length - a.length);

export function hasArabic(text: string): boolean {
  return ARABIC_RE.test(text);
}

/** Display-only localization. Returns English when locale is en. */
export function localizeContent(
  text: string | null | undefined,
  locale: Locale,
): string {
  if (text == null) return "";
  if (locale !== "en") return text;
  if (!hasArabic(text)) return text;
  const exact = CONTENT_EN[text];
  if (exact && !hasArabic(exact)) return exact;
  const trimmed = text.trim();
  const trimmedHit = CONTENT_EN[trimmed];
  if (trimmedHit && !hasArabic(trimmedHit)) return trimmedHit;
  let out = text;
  for (const k of CONTENT_EN_KEYS_BY_LEN) {
    const en = CONTENT_EN[k];
    if (en && !hasArabic(en) && out.includes(k)) out = out.split(k).join(en);
  }
  if (!hasArabic(out)) return out;
  const stripped = out
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Prefer leftover Latin tokens (codes, IDs) over a generic placeholder.
  return stripped || "—";
}

const SKIP_KEYS = new Set([
  "id",
  "organizationId",
  "planId",
  "subscriptionId",
  "actorId",
  "userId",
  "email",
  "phone",
  "password",
  "code",
  "currency",
  "clientType",
  "status",
  "priority",
  "customerKind",
  "deploymentType",
  "role",
  "billingCycle",
  "vatRate",
  "createdAt",
  "updatedAt",
  "renewAt",
  "startAt",
  "issueDate",
  "dueDate",
  "paidAt",
  "trialEndsAt",
  "renewalAt",
  "endsAt",
  "startedAt",
  "endedAt",
  "mrrSar",
  "totalSar",
  "subtotalSar",
  "vatSar",
  "priceMonthly",
  "priceAnnual",
  "limits",
  "entitlements",
  "enabledModules",
  "usage",
  "seats",
  "trialDays",
  "seatsIncluded",
  "active",
  "features",
  "workflow",
  "logoInitials",
  "crNumber",
  "vatNumber",
  "website",
  "organizationId",
  "interestedPlanId",
  "assigneeName",
  "number",
  "ip",
  "result",
  "targetType",
  "targetId",
  "before",
  "after",
  "history",
  "messages",
  "integrations",
  "recentErrors",
  "featureFlags",
  "defaultTimezone",
  "defaultLanguage",
  "emailFrom",
  "supportEmail",
  "apiAvailabilityPct",
  "avgResponseMs",
  "failedJobs24h",
  "errorRatePct",
  "storageUsedTb",
  "dbHealth",
]);

export function localizeDeep<T>(value: T, locale: Locale): T {
  if (locale !== "en") return value;
  if (value == null) return value;
  if (typeof value === "string") return localizeContent(value, locale) as T;
  if (Array.isArray(value)) return value.map((v) => localizeDeep(v, locale)) as T;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP_KEYS.has(k)) out[k] = v;
      else out[k] = localizeDeep(v, locale);
    }
    return out as T;
  }
  return value;
}