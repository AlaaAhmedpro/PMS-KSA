import { useMemo } from "react";
import {
  normalizePortfolioPolicy,
  PROFILE_TEMPLATE_LABELS,
  WORKFLOW_MODE_LABELS,
} from "../lib/orgPortfolioPolicy";
import type { OrgPortfolioPolicy } from "../models/domain";
import { useAuth } from "../store/AuthContext";

/** Active organization portfolio governance policy (normalized with profile defaults). */
export function useOrgPortfolioPolicy(): {
  policy: OrgPortfolioPolicy;
  profileLabel: string;
  workflowLabel: string;
} {
  const { organization } = useAuth();
  const policy = useMemo(
    () =>
      normalizePortfolioPolicy(
        organization?.portfolioPolicy,
        organization?.clientType ?? "government",
      ),
    [organization?.portfolioPolicy, organization?.clientType],
  );

  return {
    policy,
    profileLabel: PROFILE_TEMPLATE_LABELS[policy.profileTemplate],
    workflowLabel: WORKFLOW_MODE_LABELS[policy.workflowMode],
  };
}
