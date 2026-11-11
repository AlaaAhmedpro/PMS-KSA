import { useMemo } from "react";
import { normalizePortfolioPolicy } from "../lib/orgPortfolioPolicy";
import type { OrgPortfolioPolicy } from "../models/domain";
import { useAuth } from "../store/AuthContext";
import { useLocale } from "../store/LocaleContext";

/** Active organization portfolio governance policy (normalized with profile defaults). */
export function useOrgPortfolioPolicy(): {
  policy: OrgPortfolioPolicy;
  profileLabel: string;
  workflowLabel: string;
} {
  const { organization } = useAuth();
  const { t } = useLocale();
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
    profileLabel: t(`portfolioSettings.profileTemplate.${policy.profileTemplate}`),
    workflowLabel: t(`portfolioSettings.workflowMode.${policy.workflowMode}`),
  };
}
