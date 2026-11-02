import {
  PORTFOLIO_STATUS_LABELS,
  portfolioStatusBadgeClass,
  type PortfolioStatus,
} from "../../lib/portfolioDomain";
import { cn } from "../../lib/cn";

export function PortfolioStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const key = (status || "draft") as PortfolioStatus;
  const label = PORTFOLIO_STATUS_LABELS[key] ?? status ?? "—";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
        portfolioStatusBadgeClass(key),
        className,
      )}
    >
      {label}
    </span>
  );
}
