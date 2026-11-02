import type { Portfolio } from "../models/domain";

export type PortfolioStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "returned"
  | "pending_approval"
  | "approved"
  | "active"
  | "on_hold"
  | "rejected"
  | "closed"
  | "archived";

export type PortfolioType =
  | "strategic"
  | "digital"
  | "operational"
  | "capital"
  | "it"
  | "other";

export type PortfolioPriority = "critical" | "high" | "medium" | "low";

export type PortfolioHealth = "green" | "amber" | "red" | "unknown";

export type GovernanceModel = "pmo_central" | "federated" | "hybrid";

export interface PortfolioItemEvent {
  id: string;
  at: string;
  actorUserId?: string;
  kind: "created" | "status";
  from?: string;
  to?: string;
}

export interface PortfolioRisk {
  id: string;
  organizationId: string;
  portfolioId: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "mitigating" | "closed";
  ownerUserId?: string;
  mitigation?: string;
  createdAt: string;
  updatedAt: string;
  events?: PortfolioItemEvent[];
}

export interface PortfolioBenefit {
  id: string;
  organizationId: string;
  portfolioId: string;
  title: string;
  targetMetric?: string;
  status: "planned" | "in_progress" | "realized" | "deferred";
  notes?: string;
  createdAt: string;
  events?: PortfolioItemEvent[];
}

export interface PortfolioAuditEvent {
  id: string;
  organizationId: string;
  portfolioId: string;
  action: string;
  actorUserId?: string;
  fromStatus?: PortfolioStatus;
  toStatus?: PortfolioStatus;
  comment?: string;
  previousValues?: Record<string, string>;
  newValues?: Record<string, string>;
  createdAt: string;
}

export const PORTFOLIO_STATUS_LABELS: Record<PortfolioStatus, string> = {
  draft: "مسودة",
  submitted: "مُقدَّمة للمراجعة",
  under_review: "قيد المراجعة",
  returned: "مُعادة للتعديل",
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمدة",
  active: "نشطة",
  on_hold: "معلّقة",
  rejected: "مرفوضة",
  closed: "مغلقة",
  archived: "مؤرشفة",
};

/** Badge classes per lifecycle status (muted tint + colored text). */
export const PORTFOLIO_STATUS_BADGE: Record<PortfolioStatus, string> = {
  draft: "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:bg-steel-800/50 dark:text-steel-300",
  submitted: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  under_review: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
  returned: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  pending_approval: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  active: "border-brand-200 bg-brand-500/10 text-brand-700 dark:border-brand-800 dark:text-brand-300",
  on_hold: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100",
  rejected: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  closed: "border-steel-300 bg-steel-100 text-steel-700 dark:border-steel-600 dark:bg-steel-800 dark:text-steel-200",
  archived: "border-steel-200 bg-steel-50 text-steel-500 dark:border-steel-700 dark:bg-steel-900 dark:text-steel-400",
};

export function portfolioStatusBadgeClass(status?: string): string {
  if (status && status in PORTFOLIO_STATUS_BADGE) {
    return PORTFOLIO_STATUS_BADGE[status as PortfolioStatus];
  }
  return PORTFOLIO_STATUS_BADGE.draft;
}

export const PORTFOLIO_TYPE_LABELS: Record<PortfolioType, string> = {
  strategic: "استراتيجية",
  digital: "تحول رقمي",
  operational: "تشغيلية",
  capital: "استثمار رأسمالي",
  it: "تقنية معلومات",
  other: "أخرى",
};

export const PORTFOLIO_PRIORITY_LABELS: Record<PortfolioPriority, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

export const PORTFOLIO_HEALTH_LABELS: Record<PortfolioHealth, string> = {
  green: "مستقرة",
  amber: "تحتاج متابعة",
  red: "حرجة",
  unknown: "غير محددة",
};

export const GOVERNANCE_LABELS: Record<GovernanceModel, string> = {
  pmo_central: "PMO مركزي",
  federated: "لا مركزي",
  hybrid: "هجين",
};

/** Remaining = Approved - Actual */
export function remainingBudget(approved: number, actual: number): number {
  return approved - actual;
}

/** Variance = Actual - Approved (positive overspend) */
export function budgetVariance(approved: number, actual: number): number {
  return actual - approved;
}

export function generatePortfolioCode(
  existing: Portfolio[],
  fiscalYear: number,
): string {
  const prefix = `PF-${fiscalYear}-`;
  const nums = existing
    .map((p) => p.code)
    .filter((c): c is string => !!c && c.startsWith(prefix))
    .map((c) => Number(c.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function normalizePortfolio(p: Portfolio): Portfolio {
  const year = new Date().getFullYear();
  return {
    ...p,
    code: p.code || `PF-${year}-LEG`,
    portfolioType: p.portfolioType || "strategic",
    status: p.status || "active",
    priority: p.priority || "medium",
    health: p.health || "unknown",
    governanceModel: p.governanceModel || "pmo_central",
    currency: p.currency || "SAR",
    fiscalYear: p.fiscalYear || year,
    plannedBudgetSar: p.plannedBudgetSar ?? 0,
    approvedBudgetSar: p.approvedBudgetSar ?? 0,
    allocatedBudgetSar: p.allocatedBudgetSar ?? 0,
    actualSpendSar: p.actualSpendSar ?? 0,
    forecastSpendSar: p.forecastSpendSar ?? 0,
    objectiveIds: p.objectiveIds ?? [],
    teamUserIds: p.teamUserIds ?? [],
    expectedBenefits: p.expectedBenefits || "",
    successMetrics: p.successMetrics || "",
    budgetNotes: p.budgetNotes || "",
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
    createdByUserId: p.createdByUserId || p.ownerUserId,
  };
}
