import {
  ORG_STATUS_LABELS,
  SUB_STATUS_LABELS,
  type OrganizationStatus,
  type SubscriptionStatus,
} from "../../../lib/platformDomain";
import { StatusPill, orgStatusTone, subStatusTone } from "../StatusPill";

export function OrgStatusPill({ status }: { status: OrganizationStatus }) {
  return (
    <StatusPill label={ORG_STATUS_LABELS[status]} tone={orgStatusTone(status)} />
  );
}

export function SubStatusPill({ status }: { status: SubscriptionStatus }) {
  return (
    <StatusPill label={SUB_STATUS_LABELS[status]} tone={subStatusTone(status)} />
  );
}
