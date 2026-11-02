import type {
  OrgClientType,
  OrgPortfolioPolicy,
  Portfolio,
  PortfolioProfileTemplate,
  PortfolioWorkflowMode,
  RelationshipTypeKey,
} from "../models/domain";
import { normalizePortfolio } from "./portfolioDomain";

export type {
  OrgPortfolioPolicy,
  PortfolioProfileTemplate,
  PortfolioWorkflowMode,
};

export const DEFAULT_ALLOWED_RELS: RelationshipTypeKey[] = [
  "contains",
  "aligns_with",
  "depends_on",
  "related_to",
];

function basePolicy(
  partial: Partial<OrgPortfolioPolicy> &
    Pick<OrgPortfolioPolicy, "profileTemplate" | "workflowMode">,
): OrgPortfolioPolicy {
  return {
    version: 1,
    countryRegion: "SA",
    defaultCurrency: "SAR",
    fiscalYearStartMonth: 1,
    stages: [],
    requireSponsor: false,
    requireObjectivesOnSubmit: false,
    requireBudgetOnSubmit: false,
    requireDocumentsOnSubmit: false,
    allowDirectProjectLink: true,
    lockFieldsAfterApproval: false,
    requireReasonOnReject: true,
    requireReasonOnReturn: true,
    separationOfDuties: true,
    budgetChangeRequiresApproval: false,
    budgetApprovalThresholdSar: 0,
    varianceWarningPct: 15,
    allowedRelationshipTypes: [...DEFAULT_ALLOWED_RELS],
    requiredAtCreate: ["name", "description", "ownerUserId", "code"],
    requiredAtSubmit: [],
    requiredAtActivate: [],
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

export const PORTFOLIO_POLICY_PRESETS: Record<
  "small" | "enterprise" | "government",
  OrgPortfolioPolicy
> = {
  small: basePolicy({
    profileTemplate: "small",
    workflowMode: "simple",
    stages: [
      {
        id: "exec",
        nameAr: "اعتماد المالك / التنفيذي",
        key: "executive",
        requiredRole: "executive",
        enabled: true,
      },
    ],
    requireSponsor: false,
    requireObjectivesOnSubmit: false,
    requireBudgetOnSubmit: false,
    allowDirectProjectLink: true,
    lockFieldsAfterApproval: false,
    budgetChangeRequiresApproval: false,
    budgetApprovalThresholdSar: 500_000,
    varianceWarningPct: 20,
    requiredAtSubmit: [],
    requiredAtActivate: [],
    notes: "مسار مبسّط: مسودة → تقديم → اعتماد → تفعيل.",
  }),
  enterprise: basePolicy({
    profileTemplate: "enterprise",
    workflowMode: "standard",
    stages: [
      {
        id: "pmo",
        nameAr: "مراجعة مكتب إدارة المشاريع",
        key: "review",
        requiredRole: "pmo",
        enabled: true,
      },
      {
        id: "finance",
        nameAr: "مراجعة مالية",
        key: "finance",
        requiredRole: "finance",
        enabled: true,
      },
      {
        id: "exec",
        nameAr: "اعتماد تنفيذي",
        key: "executive",
        requiredRole: "executive",
        enabled: true,
      },
    ],
    requireSponsor: true,
    requireObjectivesOnSubmit: false,
    requireBudgetOnSubmit: true,
    allowDirectProjectLink: true,
    lockFieldsAfterApproval: true,
    budgetChangeRequiresApproval: true,
    budgetApprovalThresholdSar: 100_000,
    varianceWarningPct: 10,
    requiredAtSubmit: ["sponsorUserId", "plannedBudgetSar", "departmentId"],
    requiredAtActivate: ["approvedBudgetSar"],
    notes: "مسار مؤسسي: مراجعة PMO ثم مالية ثم اعتماد تنفيذي.",
  }),
  government: basePolicy({
    profileTemplate: "government",
    workflowMode: "formal",
    stages: [
      {
        id: "pmo",
        nameAr: "مراجعة الاستراتيجية / PMO",
        key: "review",
        requiredRole: "pmo",
        enabled: true,
      },
      {
        id: "finance",
        nameAr: "مراجعة الاعتمادات المالية",
        key: "finance",
        requiredRole: "finance",
        enabled: true,
      },
      {
        id: "exec",
        nameAr: "قرار الجهة المخوّلة",
        key: "executive",
        requiredRole: "executive",
        enabled: true,
      },
    ],
    requireSponsor: true,
    requireObjectivesOnSubmit: true,
    requireBudgetOnSubmit: true,
    requireDocumentsOnSubmit: true,
    allowDirectProjectLink: true,
    lockFieldsAfterApproval: true,
    budgetChangeRequiresApproval: true,
    budgetApprovalThresholdSar: 50_000,
    varianceWarningPct: 5,
    requiredAtSubmit: [
      "sponsorUserId",
      "objectiveIds",
      "plannedBudgetSar",
      "startDate",
      "departmentId",
    ],
    requiredAtActivate: ["approvedBudgetSar"],
    notes: "حوكمة رسمية مع أسباب إلزامية وأهداف استراتيجية عند التقديم.",
  }),
};

export function policyForClientType(clientType: OrgClientType): OrgPortfolioPolicy {
  if (clientType === "small") return structuredClone(PORTFOLIO_POLICY_PRESETS.small);
  if (clientType === "enterprise")
    return structuredClone(PORTFOLIO_POLICY_PRESETS.enterprise);
  return structuredClone(PORTFOLIO_POLICY_PRESETS.government);
}

export function normalizePortfolioPolicy(
  input: Partial<OrgPortfolioPolicy> | null | undefined,
  fallbackClient: OrgClientType = "government",
): OrgPortfolioPolicy {
  const base = policyForClientType(fallbackClient);
  if (!input) return base;
  return {
    ...base,
    ...input,
    stages: input.stages?.length ? input.stages : base.stages,
    allowedRelationshipTypes: input.allowedRelationshipTypes?.length
      ? input.allowedRelationshipTypes
      : base.allowedRelationshipTypes,
    requiredAtCreate: input.requiredAtCreate?.length
      ? input.requiredAtCreate
      : base.requiredAtCreate,
    requiredAtSubmit: input.requiredAtSubmit ?? base.requiredAtSubmit,
    requiredAtActivate: input.requiredAtActivate ?? base.requiredAtActivate,
    version: Number(input.version) || base.version,
  };
}

export function validatePortfolioAgainstPolicy(
  portfolio: Portfolio,
  policy: OrgPortfolioPolicy,
  stage: "create" | "submit" | "activate",
): { ok: boolean; errors: string[] } {
  const p = normalizePortfolio(portfolio);
  const errors: string[] = [];

  const need = (cond: boolean, msg: string) => {
    if (cond) errors.push(msg);
  };

  if (stage === "create" || stage === "submit") {
    for (const f of policy.requiredAtCreate) {
      if (f === "name" && !p.name.trim()) need(true, "اسم المحفظة مطلوب.");
      if (f === "description" && !p.description.trim())
        need(true, "وصف المحفظة مطلوب.");
      if (f === "ownerUserId" && !p.ownerUserId)
        need(true, "مالك المحفظة مطلوب.");
      if (f === "code" && !p.code) need(true, "رمز المحفظة مطلوب.");
    }
  }

  if (stage === "submit") {
    for (const f of policy.requiredAtSubmit) {
      if (f === "sponsorUserId" && !p.sponsorUserId)
        need(true, "الراعي التنفيذي مطلوب حسب سياسة المنظمة.");
      if (f === "objectiveIds" && !(p.objectiveIds || []).length)
        need(true, "يجب ربط هدف استراتيجي واحد على الأقل.");
      if (f === "plannedBudgetSar" && !(p.plannedBudgetSar! > 0))
        need(true, "الميزانية المخططة مطلوبة عند التقديم.");
      if (f === "startDate" && !p.startDate)
        need(true, "تاريخ البدء مطلوب عند التقديم.");
      if (f === "departmentId" && !p.departmentId)
        need(true, "الإدارة المسؤولة مطلوبة عند التقديم.");
    }
    if (policy.requireSponsor && !p.sponsorUserId) {
      need(true, "الراعي التنفيذي إلزامي في هذا الملف التشغيلي.");
    }
    if (policy.requireObjectivesOnSubmit && !(p.objectiveIds || []).length) {
      need(true, "المواءمة الاستراتيجية إلزامية عند التقديم.");
    }
    if (policy.requireBudgetOnSubmit && !(p.plannedBudgetSar! > 0)) {
      need(true, "بيانات الميزانية إلزامية عند التقديم.");
    }
    if (policy.requireDocumentsOnSubmit) {
      if (!(p.budgetNotes || p.successMetrics || p.expectedBenefits)) {
        need(
          true,
          "السياسة تتطلب مستندات/معلومات داعمة (أضف ملاحظات ميزانية أو مؤشرات نجاح).",
        );
      }
    }
  }

  if (stage === "activate") {
    for (const f of policy.requiredAtActivate) {
      if (f === "approvedBudgetSar" && !(p.approvedBudgetSar! > 0)) {
        need(true, "الميزانية المعتمدة مطلوبة قبل التفعيل.");
      }
    }
  }

  if (p.startDate && p.endDate && p.endDate < p.startDate) {
    need(true, "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.");
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

export function policyEnabledActions(policy: OrgPortfolioPolicy): Set<string> {
  if (policy.workflowMode === "simple") {
    return new Set([
      "submit",
      "resubmit",
      "approve",
      "reject",
      "return",
      "activate",
      "suspend",
      "resume",
      "close",
      "archive",
    ]);
  }
  const set = new Set([
    "submit",
    "resubmit",
    "start_review",
    "return",
    "recommend_approve",
    "approve",
    "reject",
    "activate",
    "suspend",
    "resume",
    "close",
    "archive",
  ]);
  if (!policy.stages.some((s) => s.key === "review" && s.enabled)) {
    set.delete("start_review");
    set.delete("recommend_approve");
  }
  return set;
}

export function isFieldLocked(
  portfolio: Portfolio,
  policy: OrgPortfolioPolicy,
  field: string,
): boolean {
  if (!policy.lockFieldsAfterApproval) return false;
  const status = normalizePortfolio(portfolio).status;
  if (!status) return false;
  if (["approved", "active", "on_hold", "closed", "archived"].includes(status)) {
    return [
      "plannedBudgetSar",
      "approvedBudgetSar",
      "objectiveIds",
      "portfolioType",
      "code",
    ].includes(field);
  }
  return false;
}

export function validatePolicyConfig(policy: OrgPortfolioPolicy): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!policy.stages.some((s) => s.enabled)) {
    errors.push("يجب تفعيل مرحلة اعتماد واحدة مراجعة واحدة على الأقل.");
  }
  if (policy.fiscalYearStartMonth < 1 || policy.fiscalYearStartMonth > 12) {
    errors.push("شهر بداية السنة المالية غير صالح.");
  }
  if (policy.budgetApprovalThresholdSar < 0) {
    errors.push("عتبة الاعتماد المالي لا يمكن أن تكون سالبة.");
  }
  if (policy.varianceWarningPct < 0 || policy.varianceWarningPct > 100) {
    errors.push("نسبة تحذير الانحراف يجب أن تكون بين 0 و 100.");
  }
  return { ok: errors.length === 0, errors };
}

export const PROFILE_TEMPLATE_LABELS: Record<PortfolioProfileTemplate, string> =
  {
    small: "شركة صغيرة",
    enterprise: "مؤسسة كبيرة",
    government: "جهة حكومية",
    custom: "مخصص",
  };

export const WORKFLOW_MODE_LABELS: Record<PortfolioWorkflowMode, string> = {
  simple: "مبسط",
  standard: "قياسي مؤسسي",
  formal: "رسمي / حوكمة",
};
