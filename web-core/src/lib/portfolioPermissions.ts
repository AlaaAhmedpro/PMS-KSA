import type { AnyRoleId } from "./types";
import type { OrgPortfolioPolicy, Portfolio } from "../models/domain";
import type { PortfolioWorkflowAction } from "../services/portfolioWorkflow";
import { isFieldLocked } from "./orgPortfolioPolicy";

function isSuperAdmin(role?: AnyRoleId): boolean {
  return (
    role === "super_admin" ||
    role === "system_admin" ||
    role === "org_admin"
  );
}

/** Demo permission layer mapped onto existing RBAC keys + role checks. */
export function canViewPortfolio(has: {
  viewStrategic: boolean;
  managePortfolio: boolean;
}): boolean {
  return has.viewStrategic || has.managePortfolio;
}

export function canCreatePortfolio(has: {
  managePortfolio: boolean;
  role?: AnyRoleId;
}): boolean {
  return has.managePortfolio || isSuperAdmin(has.role);
}

export function canEditPortfolio(
  has: { managePortfolio: boolean; role?: AnyRoleId },
  status?: string,
  policy?: OrgPortfolioPolicy | null,
  portfolio?: Portfolio | null,
): boolean {
  if (!has.managePortfolio && !isSuperAdmin(has.role)) return false;
  if (status === "closed" || status === "archived") {
    return isSuperAdmin(has.role);
  }
  if (status === "rejected" && !isSuperAdmin(has.role)) {
    return false;
  }
  if (
    policy?.lockFieldsAfterApproval &&
    portfolio &&
    ["approved", "active", "on_hold"].includes(status || "")
  ) {
    return true;
  }
  return (
    !status ||
    status === "draft" ||
    status === "returned" ||
    status === "active" ||
    status === "approved" ||
    status === "submitted" ||
    status === "under_review" ||
    status === "pending_approval" ||
    isSuperAdmin(has.role)
  );
}

export function canManagePortfolioBudget(has: {
  managePortfolio: boolean;
  role?: AnyRoleId;
}): boolean {
  return (
    has.managePortfolio ||
    isSuperAdmin(has.role) ||
    has.role === "executive"
  );
}

/** Whether a direct budget write is allowed without a change request. */
export function canApplyBudgetChangeDirectly(
  has: { managePortfolio: boolean; role?: AnyRoleId },
  policy: OrgPortfolioPolicy,
  portfolio: Portfolio,
  proposedApprovedBudget: number,
): { ok: boolean; reason?: string; requiresApproval?: boolean } {
  if (!canManagePortfolioBudget(has)) {
    return { ok: false, reason: "ليس لديك صلاحية تعديل الميزانية." };
  }
  if (portfolio.status === "closed" || portfolio.status === "archived") {
    return { ok: false, reason: "لا يمكن تعديل ميزانية محفظة مغلقة أو مؤرشفة." };
  }
  const delta = Math.abs(
    proposedApprovedBudget - (portfolio.approvedBudgetSar || 0),
  );
  if (
    !isSuperAdmin(has.role) &&
    policy.budgetChangeRequiresApproval &&
    ["approved", "active", "on_hold"].includes(portfolio.status || "") &&
    delta >= policy.budgetApprovalThresholdSar
  ) {
    return {
      ok: false,
      requiresApproval: true,
      reason: `تغيير الميزانية يتجاوز العتبة (${policy.budgetApprovalThresholdSar.toLocaleString("en-US")} ر.س) ويتطلب اعتماداً مالياً (محاكاة ديمو: سجّل الطلب في التعليق ولا يُطبَّق تلقائياً).`,
    };
  }
  if (
    policy.lockFieldsAfterApproval &&
    isFieldLocked(portfolio, policy, "approvedBudgetSar") &&
    !isSuperAdmin(has.role) &&
    has.role !== "executive"
  ) {
    return {
      ok: false,
      reason: "الميزانية المعتمدة مقفلة بعد الاعتماد حسب السياسة.",
    };
  }
  return { ok: true };
}

export function canRunPortfolioAction(
  action: PortfolioWorkflowAction,
  has: { managePortfolio: boolean; role?: AnyRoleId },
): boolean {
  // Super / org admin: all workflow actions available for the current status
  if (isSuperAdmin(has.role)) return true;

  const isExec = has.role === "executive";
  const isPmo = has.managePortfolio;
  const isFinance = String(has.role).includes("finance");
  switch (action) {
    case "submit":
    case "resubmit":
    case "activate":
    case "suspend":
    case "resume":
    case "close":
    case "archive":
      return has.managePortfolio || isExec;
    case "start_review":
    case "return":
    case "recommend_approve":
      return isPmo || isFinance;
    case "approve":
    case "reject":
      return isExec || isFinance;
    default:
      return false;
  }
}

export function canConfigurePortfolioPolicies(role?: AnyRoleId): boolean {
  return isSuperAdmin(role);
}
