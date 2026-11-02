import type { SubscriptionPlan } from "./types";
import { CLIENT_TYPE_META, modulesForClientType, normalizeOrgModules } from "./orgModules";

const PLAN_DEFAULT_CLIENT = {
  starter: "small",
  professional: "enterprise",
  enterprise: "government",
} as const;

/** Ensure legacy plans get clientType / workflow / modules. */
export function migratePlan(plan: SubscriptionPlan): SubscriptionPlan {
  const clientType =
    plan.clientType ??
    PLAN_DEFAULT_CLIENT[plan.id] ??
    "small";
  const meta = CLIENT_TYPE_META[clientType];
  return {
    ...plan,
    clientType,
    description: plan.description || meta.description,
    workflow: plan.workflow || meta.workflow,
    features: plan.features?.length ? plan.features : [...meta.defaultFeatures],
    enabledModules: normalizeOrgModules(
      plan.enabledModules ?? modulesForClientType(clientType),
    ),
  };
}

export function migratePlans(list: SubscriptionPlan[]): SubscriptionPlan[] {
  return list.map(migratePlan);
}
