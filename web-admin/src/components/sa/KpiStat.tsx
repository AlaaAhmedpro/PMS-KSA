import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";

export function KpiStat({
  label,
  value,
  hint,
  to,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  to?: string;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const body = (
    <div
      className={cn(
        "sa-kpi p-4 transition",
        to && "cursor-pointer hover:-translate-y-px",
        tone === "danger" && "border-red-200",
        tone === "warning" && "border-amber-200",
        tone === "success" && "border-emerald-200",
      )}
    >
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
