import { STATUS_META } from "../../lib/constants";
import { cn } from "../../lib/cn";
import type { Status } from "../../lib/types";
import { useLocale } from "../../store/LocaleContext";

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const { L } = useLocale();
  const meta = STATUS_META[status];
  const isOverdue = status === "overdue";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        meta.badge,
        isOverdue && "animate-pulse-red",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {L(meta.label)}
    </span>
  );
}
