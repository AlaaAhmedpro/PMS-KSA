import { useMemo, useState } from "react";
import { FileBarChart, Printer, ChevronLeft } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ReportModal } from "../components/common/ReportModal";
import { useData } from "../store/DataStore";
import { computeKpis } from "../lib/status";
import { formatNumber, formatPercent } from "../lib/format";
import {
  REPORT_DEFS,
  buildReport,
  type ReportId,
  type ReportTable,
} from "../lib/reports";
import { cn } from "../lib/cn";

export function Reports() {
  const { records, branches, departments, entities } = useData();
  const kpis = useMemo(() => computeKpis(records), [records]);
  const [activeReport, setActiveReport] = useState<ReportTable | null>(null);

  const openReport = (id: ReportId) => {
    setActiveReport(
      buildReport(id, records, { branches, departments, entities }),
    );
  };

  return (
    <div>
      <PageHeader
        title="التقارير"
        subtitle="تقارير الموقف الإجمالي والتقارير المتخصصة القابلة للطباعة والتصدير"
        icon={<FileBarChart className="h-6 w-6" />}
        actions={
          <Button onClick={() => window.print()} className="no-print">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader title="تقرير الموقف الإجمالي" subtitle="ملخص شامل" />
        <div className="grid grid-cols-2 gap-4 p-5 pt-0 md:grid-cols-4">
          <ReportStat label="إجمالي السجلات" value={formatNumber(kpis.total)} />
          <ReportStat label="المنجزة" value={formatNumber(kpis.done)} tone="brand" />
          <ReportStat label="قيد التنفيذ" value={formatNumber(kpis.active)} tone="amber" />
          <ReportStat label="المتأخرة" value={formatNumber(kpis.overdue)} tone="red" />
          <ReportStat label="المفتوحة" value={formatNumber(kpis.open)} />
          <ReportStat label="المغلقة" value={formatNumber(kpis.closed)} />
          <ReportStat label="نسبة الإنجاز" value={formatPercent(kpis.completionRate)} tone="brand" />
          <ReportStat label="نسبة الالتزام" value={formatPercent(kpis.commitmentRate)} tone="sky" />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="تقارير متخصصة"
          subtitle="اضغط على أي تقرير لعرض تفاصيله وطباعته أو تصديره Excel"
        />
        <div className="grid grid-cols-1 gap-3 p-5 pt-0 md:grid-cols-3">
          {REPORT_DEFS.map((def) => (
            <button
              key={def.id}
              onClick={() => openReport(def.id)}
              className="group flex items-start gap-3 rounded-xl border border-steel-200 p-4 text-right transition-colors hover:border-brand-500/40 hover:bg-brand-500/5 dark:border-steel-700"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <FileBarChart className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-steel-700 dark:text-steel-200">
                  {def.label}
                </p>
                <p className="mt-0.5 text-xs text-steel-400">{def.description}</p>
              </div>
              <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-steel-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-brand-500" />
            </button>
          ))}
        </div>
      </Card>

      <ReportModal
        report={activeReport}
        open={!!activeReport}
        onClose={() => setActiveReport(null)}
      />
    </div>
  );
}

function ReportStat({
  label,
  value,
  tone = "steel",
}: {
  label: string;
  value: string;
  tone?: "steel" | "brand" | "amber" | "red" | "sky";
}) {
  const colors = {
    steel: "text-steel-700 dark:text-steel-100",
    brand: "text-brand-600 dark:text-brand-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    sky: "text-sky-600 dark:text-sky-400",
  };
  return (
    <div className="rounded-xl border border-steel-200 p-4 dark:border-steel-700">
      <p className="text-xs text-steel-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold", colors[tone])}>{value}</p>
    </div>
  );
}
