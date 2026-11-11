import {
  portfolioStatusBadgeClass,
  type PortfolioStatus,
} from "../../lib/portfolioDomain";
import { cn } from "../../lib/cn";
import { useLocale } from "../../store/LocaleContext";
import { labelOf } from "../../i18n/label";

export function PortfolioStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const { t } = useLocale();
  const key = (status || "draft") as PortfolioStatus;
  const label = labelOf(t, "portfolio.status", key);
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
