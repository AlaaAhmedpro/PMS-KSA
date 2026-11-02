import { PageScaffold } from "../../components/sa/PageScaffold";
import { StatusPill } from "../../components/sa/StatusPill";
import { usePlatform } from "../../store/PlatformStore";

export function MonitoringPage() {
  const { monitoring } = usePlatform();

  return (
    <PageScaffold
      title="مراقبة النظام"
      subtitle="مؤشرات تشغيلية للديمو — تساعد على رصد المشاكل بسرعة"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="توفر API" value={`${monitoring.apiAvailabilityPct}%`} ok />
        <Card label="متوسط الاستجابة" value={`${monitoring.avgResponseMs} ms`} />
        <Card
          label="مهام فاشلة (24س)"
          value={String(monitoring.failedJobs24h)}
          warn={monitoring.failedJobs24h > 0}
        />
        <Card
          label="معدل الأخطاء"
          value={`${monitoring.errorRatePct}%`}
          warn={monitoring.errorRatePct > 1}
        />
        <Card label="التخزين" value={`${monitoring.storageUsedTb} TB`} />
        <Card
          label="قاعدة البيانات"
          value={
            monitoring.dbHealth === "healthy"
              ? "سليمة"
              : monitoring.dbHealth === "degraded"
                ? "متدهورة"
                : "متوقفة"
          }
          ok={monitoring.dbHealth === "healthy"}
          warn={monitoring.dbHealth !== "healthy"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="sa-surface p-4">
          <h3 className="text-sm font-extrabold">حالة التكاملات</h3>
          <ul className="mt-3 space-y-2">
            {monitoring.integrations.map((i) => (
              <li
                key={i.name}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="font-semibold">{i.name}</span>
                <StatusPill
                  label={
                    i.status === "up"
                      ? "يعمل"
                      : i.status === "degraded"
                        ? "متدهور"
                        : "متوقف"
                  }
                  tone={
                    i.status === "up"
                      ? "success"
                      : i.status === "degraded"
                        ? "warning"
                        : "danger"
                  }
                />
              </li>
            ))}
          </ul>
        </div>
        <div className="sa-surface p-4">
          <h3 className="text-sm font-extrabold">سجل أخطاء حديث</h3>
          <ul className="mt-3 space-y-2">
            {monitoring.recentErrors.map((e, idx) => (
              <li
                key={idx}
                className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm"
              >
                <p className="font-bold text-red-700">{e.code}</p>
                <p className="text-slate-700">{e.message}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {e.at.replace("T", " ").slice(0, 16)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageScaffold>
  );
}

function Card({
  label,
  value,
  ok,
  warn,
}: {
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`sa-kpi p-4 ${warn ? "border-amber-200" : ok ? "border-emerald-200" : ""}`}
    >
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-extrabold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
