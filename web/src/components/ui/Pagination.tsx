import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../lib/format";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  rangeStart,
  rangeEnd,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  className?: string;
}) {
  if (total === 0) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-steel-100 px-4 py-3 dark:border-steel-800 sm:flex-row",
        className,
      )}
    >
      <p className="text-xs font-medium text-steel-500 dark:text-steel-400">
        عرض{" "}
        <span className="font-bold text-steel-700 dark:text-steel-200">
          {formatNumber(rangeStart)}–{formatNumber(rangeEnd)}
        </span>{" "}
        من{" "}
        <span className="font-bold text-steel-700 dark:text-steel-200">
          {formatNumber(total)}
        </span>
      </p>

      <div className="flex items-center gap-1">
        <PageBtn
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="hidden sm:inline">السابق</span>
        </PageBtn>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1 text-sm text-steel-400"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-bold transition-colors",
                p === page
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-steel-600 hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800",
              )}
            >
              {formatNumber(p)}
            </button>
          ),
        )}

        <PageBtn
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="الصفحة التالية"
        >
          <span className="hidden sm:inline">التالي</span>
          <ChevronLeft className="h-4 w-4" />
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition-colors",
        disabled
          ? "cursor-not-allowed text-steel-300 dark:text-steel-600"
          : "text-steel-600 hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800",
      )}
    >
      {children}
    </button>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const list: (number | "…")[] = [1];
  if (current > 3) list.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p += 1) list.push(p);
  if (current < total - 2) list.push("…");
  list.push(total);
  return list;
}
