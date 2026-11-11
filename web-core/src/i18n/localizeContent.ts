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
export function localizeContent(text: string | null | undefined, locale: Locale): string {
  if (text == null) return "";
  if (locale !== "en") return text;
  if (!hasArabic(text)) return text;
  const exact = CONTENT_EN[text];
  if (exact) return exact;
  const trimmed = text.trim();
  if (CONTENT_EN[trimmed]) return CONTENT_EN[trimmed];
  // Phrase replacement: replace known longer keys first
  let out = text;
  for (const k of CONTENT_EN_KEYS_BY_LEN) {
    if (out.includes(k)) out = out.split(k).join(CONTENT_EN[k]);
  }
  if (!hasArabic(out)) return out;
  // Last resort: strip Arabic script so EN mode never shows Arabic letters
  return out.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, "").replace(/\s{2,}/g, " ").trim() || "Item";
}

const SKIP_KEYS = new Set([
  "id",
  "organizationId",
  "ownerUserId",
  "sponsorUserId",
  "createdByUserId",
  "submittedByUserId",
  "approvedByUserId",
  "email",
  "phone",
  "nationalId",
  "password",
  "tempPassword",
  "activationToken",
  "code",
  "currency",
  "clientType",
  "status",
  "priority",
  "health",
  "portfolioType",
  "governanceModel",
  "relationshipType",
  "sourceType",
  "targetType",
  "sourceId",
  "targetId",
  "projectId",
  "programId",
  "portfolioId",
  "initiativeId",
  "objectiveId",
  "milestoneId",
  "taskId",
  "vendorId",
  "departmentId",
  "branchId",
  "categoryId",
  "roleId",
  "userId",
  "createdAt",
  "updatedAt",
  "startDate",
  "endDate",
  "dueDate",
  "submittedAt",
  "approvedAt",
  "effectiveFrom",
  "effectiveTo",
  "fiscalYear",
  "targetYear",
  "progress",
  "plannedBudgetSar",
  "approvedBudgetSar",
  "allocatedBudgetSar",
  "actualSpendSar",
  "forecastSpendSar",
  "website",
  "url",
  "path",
  "mimeType",
  "sizeBytes",
  "active",
  "custom",
  "enabledModules",
  "portfolioPolicy",
  "objectiveIds",
  "teamUserIds",
  "permissionKeys",
  "permissions",
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
