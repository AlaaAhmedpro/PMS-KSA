import type {
  OrganizationStatus,
  SubscriptionStatus,
} from "../../../lib/platformDomain";
import { StatusPill, orgStatusTone, subStatusTone } from "../StatusPill";
import { usePlatformLabels } from "../../../lib/platformI18n";

export function OrgStatusPill({ status }: { status: OrganizationStatus }) {
  const { orgStatus } = usePlatformLabels();
  return (
    <StatusPill label={orgStatus(status)} tone={orgStatusTone(status)} />
  );
}

export function SubStatusPill({ status }: { status: SubscriptionStatus }) {
  const { subStatus } = usePlatformLabels();
  return (
    <StatusPill label={subStatus(status)} tone={subStatusTone(status)} />
  );
}