import { cn } from "../../lib/cn";
import type { OrganizationStatus, SubscriptionStatus } from "../../lib/platformDomain";

const TONES: Record<string, string> = {
  success: "bg-[var(--sa-success-bg)] text-[var(--sa-success)] border-[var(--sa-success)]/20",
  warning: "bg-[var(--sa-warning-bg)] text-[var(--sa-warning)] border-[var(--sa-warning)]/20",
  danger: "bg-[var(--sa-danger-bg)] text-[var(--sa-danger)] border-[var(--sa-danger)]/20",
  info: "bg-[var(--sa-info-bg)] text-[var(--sa-info)] border-[var(--sa-info)]/20",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: keyof typeof TONES;
}) {
  return <span className={cn("sa-pill border", TONES[tone])}>{label}</span>;
}

export function orgStatusTone(
  status: OrganizationStatus | string,
): keyof typeof TONES {
  if (status === "active") return "success";
  if (status === "pending" || status === "provisioning") return "info";
  if (status === "suspended") return "warning";
  if (status === "archived") return "danger";
  return "neutral";
}

export function subStatusTone(
  status: SubscriptionStatus | string,
): keyof typeof TONES {
  if (status === "active") return "success";
  if (status === "trial") return "info";
  if (status === "past_due" || status === "expired") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}
