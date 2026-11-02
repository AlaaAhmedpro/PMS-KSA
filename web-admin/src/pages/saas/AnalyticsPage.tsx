import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageScaffold } from "../../components/sa/PageScaffold";
import { Button } from "../../components/ui/Button";
import { usePlatform, formatSar } from "../../store/PlatformStore";

export function AnalyticsPage() {
  const { organizations, subscriptions, plans, invoices } = usePlatform();
  const [range, setRange] = useState<"30" | "90">("30");

  const mrr = subscriptions
    .filter((s) => s.status === "active" || s.status === "trial")
    .reduce((a, s) => a + s.mrrSar, 0);

  const series = useMemo(() => {
    const labels =
      range === "30"
        ? ["أسبوع 1", "أسبوع 2", "أسبوع 3", "أسبوع 4"]
        : ["الشهر 1", "الشهر 2", "الشهر 3"];
    return labels.map((name, i) => ({
      name,
      mrr: Math.round(mrr * (0.7 + i * 0.1)),
      orgs: Math.max(1, Math.round(organizations.length * (0.5 + i * 0.15))),
      churn: Math.max(0, 3 - i),
    }));
  }, [range, mrr, organizations.length]);

  const planPerf = plans.map((p) => ({
    name: p.name,
    count: organizations.filter((o) => o.planId === p.id).length,
    revenue: subscriptions
      .filter((s) => s.planId === p.id && (s.status === "active" || s.status === "trial"))
      .reduce((a, s) => a + s.mrrSar, 0),
  }));

  const exportCsv = () => {
    const lines = [
      "plan,count,mrr",
      ...planPerf.map((r) => `${r.name},${r.count},${r.revenue}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plan-performance.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const paid = invoices
    .filter((i) => i.status === "paid")
    .reduce((a, i) => a + i.totalSar, 0);

  return (
    <PageScaffold
      title="التحليلات والتقارير"
      subtitle="MRR / ARR / النمو / أداء الخطط"
      actions={
        <>
          <div className="flex rounded-md border border-slate-200 p-0.5 text-xs font-bold">
            {(["30", "90"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded px-2.5 py-1.5 ${range === r ? "bg-slate-900 text-white" : "text-slate-500"}`}
              >
                {r}ي
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            تصدير CSV
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="MRR" value={formatSar(mrr)} />
        <Stat label="ARR" value={formatSar(mrr * 12)} />
        <Stat label="منشآت" value={String(organizations.length)} />
        <Stat label="إيراد محصّل" value={formatSar(paid)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="sa-surface p-4">
          <h3 className="text-sm font-extrabold">اتجاه MRR والمنشآت</h3>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="mrr" name="MRR" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="orgs" name="منشآت" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="sa-surface p-4">
          <h3 className="text-sm font-extrabold">أداء الخطط (MRR)</h3>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planPerf} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="revenue" name="MRR" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </PageScaffold>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sa-kpi p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}
