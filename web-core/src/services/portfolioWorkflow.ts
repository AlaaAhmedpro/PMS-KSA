import type { OrgPortfolioPolicy, Portfolio } from "../models/domain";
import {
  normalizePortfolio,
  type PortfolioStatus,
} from "../lib/portfolioDomain";
import {
  normalizePortfolioPolicy,
  policyEnabledActions,
  validatePortfolioAgainstPolicy,
} from "../lib/orgPortfolioPolicy";

export type PortfolioWorkflowAction =
  | "submit"
  | "start_review"
  | "return"
  | "recommend_approve"
  | "approve"
  | "reject"
  | "activate"
  | "suspend"
  | "resume"
  | "close"
  | "archive"
  | "resubmit";

type Transition = {
  from: PortfolioStatus[];
  to: PortfolioStatus;
  requireReason?: boolean;
};

const BASE_TRANSITIONS: Record<PortfolioWorkflowAction, Transition> = {
  submit: {
    from: ["draft", "returned"],
    to: "submitted",
  },
  start_review: { from: ["submitted"], to: "under_review" },
  return: {
    from: ["under_review", "pending_approval", "submitted"],
    to: "returned",
    requireReason: true,
  },
  recommend_approve: {
    from: ["under_review"],
    to: "pending_approval",
  },
  approve: {
    from: ["pending_approval", "under_review"],
    to: "approved",
  },
  reject: {
    from: ["under_review", "pending_approval", "submitted"],
    to: "rejected",
    requireReason: true,
  },
  activate: { from: ["approved", "on_hold"], to: "active" },
  suspend: { from: ["active"], to: "on_hold", requireReason: true },
  resume: { from: ["on_hold"], to: "active" },
  close: {
    from: ["active", "approved", "on_hold", "rejected"],
    to: "closed",
    requireReason: true,
  },
  archive: { from: ["closed", "rejected"], to: "archived" },
  resubmit: {
    from: ["returned", "rejected"],
    to: "submitted",
  },
};

function transitionsForPolicy(
  policy: OrgPortfolioPolicy,
): Record<PortfolioWorkflowAction, Transition> {
  const t = structuredClone(BASE_TRANSITIONS);
  if (policy.workflowMode === "simple") {
    // Draft → Submitted → Approve → Active (no PMO/finance stages)
    t.approve = {
      from: ["submitted", "pending_approval", "under_review"],
      to: "approved",
    };
  } else {
    const hasReview = policy.stages.some((s) => s.key === "review" && s.enabled);
    const hasFinance = policy.stages.some((s) => s.key === "finance" && s.enabled);
    if (!hasReview) {
      // Skip explicit review: submitted can go to pending_approval via recommend or approve
      t.recommend_approve = {
        from: ["submitted", "under_review"],
        to: "pending_approval",
      };
      t.approve = {
        from: ["pending_approval", "submitted", "under_review"],
        to: "approved",
      };
    }
    if (hasFinance && hasReview) {
      // Keep multi-stage path; finance gate is role-based at UI, status stays pending_approval
      t.approve = {
        from: ["pending_approval", "under_review"],
        to: "approved",
      };
    }
  }
  return t;
}

export function canTransition(
  portfolio: Portfolio,
  action: PortfolioWorkflowAction,
  policyInput?: OrgPortfolioPolicy | null,
): { ok: boolean; reason?: string } {
  const policy = normalizePortfolioPolicy(policyInput ?? undefined);
  const enabled = policyEnabledActions(policy);
  if (!enabled.has(action)) {
    return {
      ok: false,
      reason: `الإجراء «${action}» غير مفعّل في سياسة مسار العمل الحالية.`,
    };
  }
  const p = normalizePortfolio(portfolio);
  const rule = transitionsForPolicy(policy)[action];
  if (!rule.from.includes(p.status!)) {
    return {
      ok: false,
      reason: `لا يمكن تنفيذ «${action}» من حالة ${p.status}.`,
    };
  }
  return { ok: true };
}

export function validateSubmission(
  portfolio: Portfolio,
  policyInput?: OrgPortfolioPolicy | null,
): {
  ok: boolean;
  errors: string[];
} {
  const policy = normalizePortfolioPolicy(policyInput ?? undefined);
  return validatePortfolioAgainstPolicy(portfolio, policy, "submit");
}

export function applyWorkflowAction(
  portfolio: Portfolio,
  action: PortfolioWorkflowAction,
  opts: {
    actorUserId?: string;
    reason?: string;
    now?: string;
    policy?: OrgPortfolioPolicy | null;
  },
): { ok: true; portfolio: Portfolio } | { ok: false; reason: string } {
  const policy = normalizePortfolioPolicy(opts.policy ?? undefined);
  const gate = canTransition(portfolio, action, policy);
  if (!gate.ok) return { ok: false, reason: gate.reason || "انتقال غير صالح." };

  const rule = transitionsForPolicy(policy)[action];
  const needsReason =
    rule.requireReason ||
    (action === "reject" && policy.requireReasonOnReject) ||
    (action === "return" && policy.requireReasonOnReturn);

  if (needsReason && !opts.reason?.trim()) {
    return { ok: false, reason: "يجب إدخال سبب لهذا الإجراء." };
  }

  if (action === "submit" || action === "resubmit") {
    const v = validateSubmission(portfolio, policy);
    if (!v.ok) return { ok: false, reason: v.errors.join(" ") };
  }

  if (action === "activate") {
    const v = validatePortfolioAgainstPolicy(portfolio, policy, "activate");
    if (!v.ok) return { ok: false, reason: v.errors.join(" ") };
  }

  // Separation of duties
  if (
    policy.separationOfDuties &&
    (action === "approve" || action === "reject") &&
    opts.actorUserId &&
    normalizePortfolio(portfolio).submittedByUserId &&
    opts.actorUserId === normalizePortfolio(portfolio).submittedByUserId
  ) {
    return {
      ok: false,
      reason: "لا يمكن اعتماد/رفض محفظة قدّمتها أنت (فصل المهام).",
    };
  }

  const now = opts.now ?? new Date().toISOString();
  const base = normalizePortfolio(portfolio);
  const next: Portfolio = {
    ...base,
    status: rule.to,
    updatedAt: now,
  };

  if (action === "submit" || action === "resubmit") {
    next.submittedAt = now;
    next.submittedByUserId = opts.actorUserId;
    next.reviewComment = undefined;
    next.rejectionReason = undefined;
  }
  if (action === "return") {
    next.reviewComment = opts.reason;
  }
  if (action === "reject") {
    next.rejectionReason = opts.reason;
  }
  if (action === "approve") {
    next.approvedAt = now;
    next.approvedByUserId = opts.actorUserId;
    if ((next.approvedBudgetSar ?? 0) <= 0 && (next.plannedBudgetSar ?? 0) > 0) {
      next.approvedBudgetSar = next.plannedBudgetSar;
    }
  }
  if (action === "suspend") {
    next.holdReason = opts.reason;
  }
  if (action === "resume") {
    next.holdReason = undefined;
  }
  if (action === "close") {
    next.closureReason = opts.reason;
  }

  return { ok: true, portfolio: next };
}

export function availableActions(
  portfolio: Portfolio,
  policyInput?: OrgPortfolioPolicy | null,
): PortfolioWorkflowAction[] {
  const policy = normalizePortfolioPolicy(policyInput ?? undefined);
  const p = normalizePortfolio(portfolio);
  return (Object.keys(BASE_TRANSITIONS) as PortfolioWorkflowAction[]).filter(
    (a) => canTransition(p, a, policy).ok,
  );
}
