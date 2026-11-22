import { useMemo } from "react";
import { useLocale } from "../store/LocaleContext";
import type {
  EntitlementKey,
  InvoiceStatus,
  LeadStatus,
  OrgCustomerKind,
  OrgDeploymentType,
  OrganizationStatus,
  PlatformRoleId,
  ProvisioningStatus,
  SubscriptionStatus,
  TicketPriority,
  TicketStatus,
} from "./platformDomain";
import type { OrgClientType, OrgModuleKey } from "./types";
import { CLIENT_TYPE_META } from "./orgModules";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function usePlatformLabels() {
  const { t } = useLocale();
  return useMemo(() => buildPlatformLabels(t), [t]);
}

export function buildPlatformLabels(t: TFn) {
  const orgStatus = (s: OrganizationStatus) => t(`domain.orgStatus.${s}`);
  const subStatus = (s: SubscriptionStatus) => t(`domain.subStatus.${s}`);
  const customerKind = (k: OrgCustomerKind) => t(`domain.customerKind.${k}`);
  const deployment = (d: OrgDeploymentType) => t(`domain.deployment.${d}`);
  const platformRole = (r: PlatformRoleId) => t(`domain.platformRole.${r}`);
  const entitlement = (k: EntitlementKey) => t(`domain.entitlement.${k}`);
  const invoiceStatus = (s: InvoiceStatus) => t(`domain.invoiceStatus.${s}`);
  const leadStatus = (s: LeadStatus) => t(`domain.leadStatus.${s}`);
  const ticketStatus = (s: TicketStatus) => t(`domain.ticketStatus.${s}`);
  const ticketPriority = (p: TicketPriority) => t(`domain.ticketPriority.${p}`);
  const provisioning = (s: ProvisioningStatus) =>
    t(`domain.provisioning.${s}`);
  const moduleLabel = (k: OrgModuleKey) => t(`domain.module.${k}`);
  const clientShort = (c: OrgClientType) => t(`domain.clientType.${c}.short`);
  const clientLabel = (c: OrgClientType) => t(`domain.clientType.${c}.label`);
  const clientDescription = (c: OrgClientType) =>
    t(`domain.clientType.${c}.description`);
  const clientWorkflow = (c: OrgClientType) =>
    t(`domain.clientType.${c}.workflow`);

  const selectOptions = <T extends string>(
    keys: readonly T[],
    labelFn: (k: T) => string,
  ) => keys.map((k) => ({ value: k, label: labelFn(k) }));

  return {
    orgStatus,
    subStatus,
    customerKind,
    deployment,
    platformRole,
    entitlement,
    invoiceStatus,
    leadStatus,
    ticketStatus,
    ticketPriority,
    provisioning,
    moduleLabel,
    clientShort,
    clientLabel,
    clientDescription,
    clientWorkflow,
    orgStatusOptions: () =>
      selectOptions(
        ["pending", "provisioning", "active", "suspended", "archived"] as const,
        orgStatus,
      ),
    subStatusOptions: () =>
      selectOptions(
        ["trial", "active", "past_due", "expired", "cancelled"] as const,
        subStatus,
      ),
    customerKindOptions: () =>
      selectOptions(
        ["standard", "enterprise", "government", "semi_government"] as const,
        customerKind,
      ),
    deploymentOptions: () =>
      selectOptions(
        ["shared", "dedicated", "dedicated_hosting"] as const,
        deployment,
      ),
    platformRoleOptions: () =>
      selectOptions(
        [
          "super_admin",
          "platform_admin",
          "finance_admin",
          "support_agent",
          "readonly_admin",
        ] as const,
        platformRole,
      ),
    invoiceStatusOptions: () =>
      selectOptions(
        [
          "draft",
          "open",
          "paid",
          "failed",
          "refunded",
          "void",
        ] as const,
        invoiceStatus,
      ),
    leadStatusOptions: () =>
      selectOptions(
        [
          "new",
          "qualified",
          "demo",
          "proposal",
          "negotiation",
          "won",
          "lost",
        ] as const,
        leadStatus,
      ),
    ticketStatusOptions: () =>
      selectOptions(
        [
          "open",
          "in_progress",
          "pending_customer",
          "escalated",
          "resolved",
          "closed",
        ] as const,
        ticketStatus,
      ),
    ticketPriorityOptions: () =>
      selectOptions(
        ["low", "normal", "high", "critical"] as const,
        ticketPriority,
      ),
    /** @deprecated use clientShort — kept for meta parity */
    clientTypeMeta: CLIENT_TYPE_META,
  };
}