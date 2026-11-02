export function UsageCell({
  used,
  max,
  unit = "",
}: {
  used: number;
  max: number;
  unit?: string;
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  const tone =
    pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-blue-600";
  return (
    <div className="min-w-[88px]">
      <p className="tabular-nums text-xs font-semibold text-slate-700">
        {used}
        <span className="font-normal text-slate-400">/{max}</span>
        {unit ? <span className="ms-0.5 text-slate-400">{unit}</span> : null}
      </p>
      <div className="mt-1 h-1 overflow-hidden rounded bg-slate-100">
        <div className={`h-full rounded ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-[10px] tabular-nums text-slate-400">{pct}%</p>
    </div>
  );
}
