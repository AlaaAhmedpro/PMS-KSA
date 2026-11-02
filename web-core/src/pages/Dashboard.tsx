import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Inbox,
  CheckCircle2,
  Loader,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  FolderOpen,
  Archive,
  LayoutDashboard,
  Mail,
  CalendarClock,
  BarChart3,
  Activity,
  Sparkles,
  Building2,
  PartyPopper,
  Clock,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { KpiCard } from "../components/common/KpiCard";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { StatusBadge } from "../components/ui/StatusBadge";
import { UrgentModal } from "../components/common/UrgentModal";
import {
  BranchPerformanceChart,
  CategoryPieChart,
  FlowLineChart,
  RankedBars,
} from "../components/charts/Charts";
import { useData } from "../store/DataStore";
import { computeKpis, isOverdue, overdueDays } from "../lib/status";
import { dueNext7 } from "../lib/alerts";
import {
  byCategory,
  byDepartment,
  flowByWeekOfMonth,
  mostDelayedDepartments,
  perfByBranch,
  perfByDepartmentInBranch,
  allMonthsFromRecords,
  topEntities,
} from "../lib/analytics";
import { formatNumber, formatPercent, relativeDeadline } from "../lib/format";
import { cn } from "../lib/cn";
import { usePagination, PAGE_SIZE_DEFAULT } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";
import type { RecordItem } from "../lib/types";

type Period = "month" | "quarter" | "all";
type KindFilter = "all" | "project" | "task";

const periods: { id: Period; label: string; days: number }[] = [
  { id: "month", label: "هذا الشهر", days: 30 },
  { id: "quarter", label: "آخر 3 شهور", days: 90 },
  { id: "all", label: "الكل", days: 99999 },
];

const kindLabels: Record<KindFilter, string> = {
  all: "الكل",
  project: "مشاريع",
  task: "مهام",
};

const panelAccent: Record<string, string> = {
  perf: "border-t-brand-500",
  category: "border-t-violet-500",
  flow: "border-t-sky-500",
  dept: "border-t-emerald-500",
  entities: "border-t-sky-500",
  delayed: "border-t-red-500",
  critical: "border-t-red-500",
  upcoming: "border-t-amber-500",
};

export function Dashboard() {
  const { records, branches, departments, entities, categories } = useData();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("month");
  const [kind, setKind] = useState<KindFilter>("all");
  const [urgent, setUrgent] = useState<RecordItem | null>(null);
  const months = useMemo(
    () => [...allMonthsFromRecords(records)].reverse(),
    [records],
  );
  const [flowMonth, setFlowMonth] = useState("");
  useEffect(() => {
    if (!months.length) return;
    setFlowMonth((prev) =>
      months.some((m) => m.value === prev) ? prev : months[0].value,
    );
  }, [months]);
  const [perfBranch, setPerfBranch] = useState<string>("hq");

  const filtered = useMemo(() => {
    const days = periods.find((p) => p.id === period)!.days;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return records.filter((r) => {
      const inPeriod = period === "all" || new Date(r.arrivalDate) >= cutoff;
      const inKind = kind === "all" || r.kind === kind;
      return inPeriod && inKind;
    });
  }, [records, period, kind]);

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const overdueList = useMemo(
    () =>
      filtered
        .filter(isOverdue)
        .sort((a, b) => overdueDays(a) - overdueDays(b)),
    [filtered],
  );
  const upcoming = useMemo(() => dueNext7(filtered), [filtered]);

  const perfData = useMemo(() => {
    if (perfBranch === "all") return perfByBranch(filtered, branches);
    return perfByDepartmentInBranch(filtered, perfBranch, departments);
  }, [filtered, perfBranch, branches, departments]);

  const perfBranchOptions = useMemo(
    () => [
      { value: "all", label: "كل مقار المصانع" },
      ...branches.map((b) => ({ value: b.id, label: b.name })),
    ],
    [branches],
  );
  const flowMonthOptions = useMemo(
    () => months.map((m) => ({ value: m.value, label: m.label })),
    [months],
  );

  const perfSubtitle =
    perfBranch === "all"
      ? "المنجز مقابل المتأخر لكل فرع / منطقة"
      : `المنجز مقابل المتأخر لكل أدارة / فرع — ${
          branches.find((b) => b.id === perfBranch)?.name ?? ""
        }`;

  const periodLabel = periods.find((p) => p.id === period)?.label ?? "";
  const flowChartData = useMemo(() => {
    const m = months.find((x) => x.value === flowMonth) ?? months[0];
    if (!m) return [];
    return flowByWeekOfMonth(filtered, m.year, m.month);
  }, [filtered, flowMonth, months]);

  const delayedDepts = useMemo(
    () => mostDelayedDepartments(filtered, 8, departments),
    [filtered, departments],
  );

  const overduePagination = usePagination(
    overdueList,
    PAGE_SIZE_DEFAULT,
    [period, kind],
  );
  const upcomingPagination = usePagination(
    upcoming,
    PAGE_SIZE_DEFAULT,
    [period, kind],
  );

  return (
    <div className="dash-page pb-2">
      <PageHeader
        title="لوحة الإدارة العليا"
        subtitle="متابعة الموقف الإجمالي بنظرة واحدة"
        icon={<LayoutDashboard className="h-6 w-6" />}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <FilterGroup>
              {(["all", "project", "task"] as KindFilter[]).map(
                (k) => (
                  <FilterButton
                    key={k}
                    active={kind === k}
                    onClick={() => setKind(k)}
                  >
                    {kindLabels[k]}
                  </FilterButton>
                ),
              )}
            </FilterGroup>
            <FilterGroup>
              {periods.map((p) => (
                <FilterButton
                  key={p.id}
                  active={period === p.id}
                  onClick={() => setPeriod(p.id)}
                >
                  {p.label}
                </FilterButton>
              ))}
            </FilterGroup>
          </div>
        }
      />

      {/* شريط الملخص */}
      <div className="dash-hero relative mb-6 p-4 sm:mb-8 sm:p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-brand-100">
              <Sparkles className="h-3.5 w-3.5" />
              {periodLabel} · {kindLabels[kind]}
            </div>
            <h2 className="text-2xl font-extrabold leading-snug text-white md:text-3xl">
              موقف المشاريع والمهام
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {formatNumber(kpis.total)} قيد مسجّل — نسبة الإنجاز{" "}
              <span className="font-bold text-brand-200">
                {formatPercent(kpis.completionRate)}
              </span>
              {kpis.overdue > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-bold text-red-300">
                    {formatNumber(kpis.overdue)} متأخر
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <CompletionRing percent={kpis.completionRate} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <HeroStat label="المسجّل" value={formatNumber(kpis.total)} />
              <HeroStat label="المنفذ" value={formatNumber(kpis.done)} accent />
              <HeroStat
                label="المتأخر"
                value={formatNumber(kpis.overdue)}
                warn={kpis.overdue > 0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* المؤشرات */}
      <SectionLabel icon={<Activity className="h-4 w-4" />} title="المؤشرات الرئيسية" />
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard featured label="إجمالي السجلات" value={formatNumber(kpis.total)} icon={<Inbox className="h-5 w-5" />} tone="steel" hint="خلال الفترة المحددة" delay={0} />
        <KpiCard featured label="المنفذ" value={formatNumber(kpis.done)} icon={<CheckCircle2 className="h-5 w-5" />} tone="brand" hint={`${formatPercent(kpis.total ? (kpis.done / kpis.total) * 100 : 0)} من الإجمالي`} delay={0.05} />
        <KpiCard featured label="قيد التنفيذ" value={formatNumber(kpis.active)} icon={<Loader className="h-5 w-5" />} tone="amber" hint="جارٍ العمل عليها" delay={0.1} />
        <KpiCard featured label="المتأخرات" value={formatNumber(kpis.overdue)} icon={<AlertTriangle className="h-5 w-5" />} tone="red" pulse={kpis.overdue > 0} hint={`${formatPercent(kpis.total ? (kpis.overdue / kpis.total) * 100 : 0)} من الإجمالي`} delay={0.15} />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard label="نسبة الإنجاز" value={formatPercent(kpis.completionRate)} icon={<TrendingUp className="h-4 w-4" />} tone="brand" hint="المنجزة + المغلقة" delay={0.2} />
        <KpiCard label="نسبة الالتزام" value={formatPercent(kpis.commitmentRate)} icon={<ShieldCheck className="h-4 w-4" />} tone="sky" hint="المنفذة في الموعد" delay={0.25} />
        <KpiCard label="السجلات المفتوحة" value={formatNumber(kpis.open)} icon={<FolderOpen className="h-4 w-4" />} tone="amber" delay={0.3} />
        <KpiCard label="السجلات المغلقة" value={formatNumber(kpis.closed)} icon={<Archive className="h-4 w-4" />} tone="steel" delay={0.35} />
      </div>

      {/* التحليلات */}
      <SectionLabel icon={<BarChart3 className="h-4 w-4" />} title="التحليلات والرسوم البيانية" />
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className={cn("lg:col-span-2 dash-panel-accent overflow-hidden", panelAccent.perf)}>
          <CardHeader
            title="أداء الفروع والمناطق"
            subtitle={perfSubtitle}
            icon={<TrendingUp className="h-5 w-5" />}
            variant="brand"
            action={
              <SearchableSelect
                value={perfBranch}
                onChange={setPerfBranch}
                options={perfBranchOptions}
                className="w-full sm:w-44"
                aria-label="فلتر الفرع / المنطقة"
                searchPlaceholder="بحث في المقار..."
              />
            }
          />
          <div className="dash-chart-body dash-chart-body--perf">
            {perfData.length > 0 ? (
              <BranchPerformanceChart data={perfData} />
            ) : (
              <DashEmpty icon={<Building2 className="h-8 w-8" />} message="لا توجد بيانات لهذا المقر في الفترة المحددة" />
            )}
          </div>
        </Card>
        <Card className={cn("overflow-hidden dash-panel-accent", panelAccent.category)}>
          <CardHeader title="تصنيف المشاريع" subtitle="حسب التخصص" icon={<BarChart3 className="h-5 w-5" />} variant="violet" />
          <div className="dash-chart-body">
            {byCategory(filtered, categories).length > 0 ? (
              <CategoryPieChart data={byCategory(filtered, categories)} />
            ) : (
              <DashEmpty message="لا توجد بيانات تصنيف في هذه الفترة" />
            )}
          </div>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className={cn("lg:col-span-2 overflow-hidden dash-panel-accent", panelAccent.flow)}>
          <CardHeader
            title="تدفق المشاريع والمهام"
            subtitle="حجم التسجيل أسبوعياً — لتحديد أوقات الذروة"
            icon={<Activity className="h-5 w-5" />}
            variant="sky"
            action={
              <SearchableSelect
                value={flowMonth}
                onChange={setFlowMonth}
                options={flowMonthOptions}
                className="w-full sm:w-44"
                searchPlaceholder="بحث في الشهور..."
              />
            }
          />
          <div className="dash-chart-body">
            {flowChartData.some((d) => d.value > 0) ? (
              <FlowLineChart data={flowChartData} />
            ) : (
              <DashEmpty message="لا يوجد وارد في الشهر المختار" />
            )}
          </div>
        </Card>
        <Card className={cn("overflow-hidden dash-panel-accent", panelAccent.dept)}>
          <CardHeader title="حسب الإدارات" subtitle="توزيع السجلات" icon={<Building2 className="h-5 w-5" />} variant="emerald" />
          <div className="dash-chart-body max-h-[320px] overflow-y-auto">
            {byDepartment(filtered, departments).some((d) => d.value > 0) ? (
              <RankedBars data={byDepartment(filtered, departments)} color="#7cb342" />
            ) : (
              <DashEmpty message="لا توجد بيانات" />
            )}
          </div>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className={cn("overflow-hidden dash-panel-accent", panelAccent.entities)}>
          <CardHeader title="أكثر الجهات" subtitle="أكثر الجهات ارتباطاً بالمشاريع" variant="sky" />
          <div className="dash-chart-body max-h-[300px] overflow-y-auto">
            {topEntities(filtered, entities).length > 0 ? (
              <RankedBars data={topEntities(filtered, entities)} color="#0ea5e9" />
            ) : (
              <DashEmpty message="لا توجد جهات في هذه الفترة" />
            )}
          </div>
        </Card>
        <Card className={cn("overflow-hidden dash-panel-accent", panelAccent.delayed)}>
          <CardHeader
            title="الأدارات الأكثر تأخيراً"
            subtitle="أعلى 8 أدارات من حيث التأخير"
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="red"
          />
          <div className="dash-chart-body">
            {delayedDepts.length > 0 ? (
              <RankedBars data={delayedDepts} color="#ef4444" />
            ) : (
              <DashEmpty icon={<PartyPopper className="h-8 w-8 text-brand-500" />} message="لا توجد إدارات متأخرة في هذه الفترة" />
            )}
          </div>
        </Card>
      </div>

      {/* المتابعة العاجلة */}
      <SectionLabel icon={<AlertTriangle className="h-4 w-4 text-red-500" />} title="المتابعة والتنبيهات" />
      <div className="grid grid-cols-1 gap-5">
        <Card className={cn("overflow-hidden dash-panel-accent", panelAccent.critical)}>
          <CardHeader
            title="السجلات الحرجة والمتأخرة"
            subtitle={
              overdueList.length > 0
                ? `${formatNumber(overdueList.length)} قيد يتطلب تدخلاً عاجلاً`
                : "لا توجد متأخرات حالياً"
            }
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="red"
          />
          <div className="mobile-data-list divide-y divide-steel-100 dark:divide-steel-800 md:hidden">
            {overduePagination.paginated.map((r) => {
              const entity = entities.find((e) => e.id === r.entityId);
              const branch = branches.find((b) => b.id === r.branchId);
              return (
                <div
                  key={r.id}
                  className="mobile-overdue-card p-4"
                >
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        r.kind === "task"
                          ? `/tasks/${r.id}`
                          : `/projects/${r.id}`,
                      )
                    }
                    className="w-full text-right"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                          {r.regNumber}
                        </span>
                        <p className="mt-2 line-clamp-2 text-sm font-medium text-steel-700 dark:text-steel-200">
                          {r.subject}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 animate-pulse-red items-center rounded-full bg-red-500/10 px-3 py-1 font-mono text-xs font-bold text-red-600 dark:text-red-400">
                        {formatNumber(overdueDays(r))} يوم
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-steel-500 dark:text-steel-400 sm:grid-cols-2">
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-steel-400">الجهة</span>
                        <span className="line-clamp-1">{entity?.name}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-steel-400">الفرع / المنطقة</span>
                        <span className="line-clamp-1">{branch?.name}</span>
                      </div>
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setUrgent(r)}
                    className="no-print mt-3 w-full justify-center"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    استعجال
                  </Button>
                </div>
              );
            })}
            {overdueList.length === 0 && (
              <DashEmpty
                icon={<PartyPopper className="h-8 w-8 text-brand-500" />}
                message="لا توجد سجلات متأخرة — أداء ممتاز"
              />
            )}
          </div>

          <div className="data-table-wrap hidden overflow-x-auto px-5 pb-5 md:block">
            <table className="dash-table w-full min-w-[640px] text-right text-sm">
              <thead>
                <tr className="border-y border-steel-100 bg-steel-50/90 text-steel-500 dark:border-steel-800 dark:bg-steel-800/50">
                  <th className="px-4 py-3">رقم القيد</th>
                  <th className="px-4 py-3">الجهة المرسلة</th>
                  <th className="px-4 py-3">الموضوع</th>
                  <th className="px-4 py-3">الفرع / المنطقة</th>
                  <th className="px-4 py-3">أيام التأخير</th>
                  <th className="px-4 py-3 no-print">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {overduePagination.paginated.map((r, i) => {
                  const entity = entities.find((e) => e.id === r.entityId);
                  const branch = branches.find((b) => b.id === r.branchId);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-steel-50 dark:border-steel-800/60",
                        i % 2 === 0
                          ? "bg-white dark:bg-steel-900"
                          : "bg-steel-50/40 dark:bg-steel-800/20",
                        "hover:bg-red-500/5",
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() =>
                            navigate(
                              r.kind === "task"
                                ? `/tasks/${r.id}`
                                : `/projects/${r.id}`,
                            )
                          }
                          className="font-mono text-sm font-bold text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {r.regNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-steel-600 dark:text-steel-300">{entity?.name}</td>
                      <td className="max-w-[240px] truncate px-4 py-3.5 font-medium text-steel-700 dark:text-steel-200">
                        {r.subject}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-steel-600 dark:text-steel-300">
                        {branch?.name}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex animate-pulse-red items-center rounded-full bg-red-500/10 px-3 py-1 font-mono text-xs font-bold text-red-600 dark:text-red-400">
                          {formatNumber(overdueDays(r))} يوم
                        </span>
                      </td>
                      <td className="px-4 py-3.5 no-print">
                        <Button size="sm" variant="danger" onClick={() => setUrgent(r)}>
                          <Mail className="h-3.5 w-3.5" />
                          استعجال
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {overdueList.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <DashEmpty icon={<PartyPopper className="h-8 w-8 text-brand-500" />} message="لا توجد سجلات متأخرة — أداء ممتاز" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {overdueList.length > 0 && (
            <Pagination
              page={overduePagination.page}
              totalPages={overduePagination.totalPages}
              onPageChange={overduePagination.setPage}
              total={overduePagination.total}
              rangeStart={overduePagination.rangeStart}
              rangeEnd={overduePagination.rangeEnd}
            />
          )}
        </Card>

        <Card className={cn("overflow-hidden dash-panel-accent", panelAccent.upcoming)}>
          <CardHeader
            title="الواجب تنفيذها خلال 7 أيام"
            subtitle={`${upcoming.length} مهمة مستحقة قريباً`}
            icon={<CalendarClock className="h-5 w-5" />}
            variant="amber"
          />
          <div className="grid grid-cols-1 gap-3 p-5 pt-0 md:grid-cols-2 xl:grid-cols-3">
            {upcomingPagination.paginated.map((r) => (
              <UpcomingCard
                key={r.id}
                record={r}
                onClick={() =>
                  navigate(
                    r.kind === "task"
                      ? `/tasks/${r.id}`
                      : `/projects/${r.id}`,
                  )
                }
              />
            ))}
            {upcoming.length === 0 && (
              <div className="col-span-full">
                <DashEmpty icon={<CheckCircle2 className="h-8 w-8 text-brand-500" />} message="لا توجد مهام مستحقة خلال الأسبوع القادم" />
              </div>
            )}
          </div>
          {upcoming.length > 0 && (
            <Pagination
              page={upcomingPagination.page}
              totalPages={upcomingPagination.totalPages}
              onPageChange={upcomingPagination.setPage}
              total={upcomingPagination.total}
              rangeStart={upcomingPagination.rangeStart}
              rangeEnd={upcomingPagination.rangeEnd}
            />
          )}
        </Card>
      </div>

      <div className="mt-6">
        <StatusLegend />
      </div>

      <UrgentModal record={urgent} open={!!urgent} onClose={() => setUrgent(null)} />
    </div>
  );
}

function SectionLabel({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="dash-section-label">
      <span className="flex shrink-0 items-center gap-2 text-sm font-extrabold text-steel-600 dark:text-steel-300">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
          {icon}
        </span>
        {title}
      </span>
    </div>
  );
}

function FilterGroup({ children }: { children: ReactNode }) {
  return <div className="dash-filter-group">{children}</div>;
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("dash-filter-btn", active && "dash-filter-btn--active")}
    >
      {children}
    </button>
  );
}

function CompletionRing({ percent }: { percent: number }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="dash-ring relative flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full p-1.5"
        style={{ "--pct": p } as React.CSSProperties}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#141c27]/90 text-center">
          <span className="text-xl font-extrabold tabular-nums text-white">
            {formatPercent(p)}
          </span>
          <span className="text-[10px] font-bold text-white/55">إنجاز</span>
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="min-w-[5.5rem] rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-center backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-lg font-extrabold tabular-nums",
          warn ? "text-red-300" : accent ? "text-brand-200" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DashEmpty({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="dash-empty">
      {icon && <div className="text-steel-300 dark:text-steel-600">{icon}</div>}
      <p className="text-sm font-medium text-steel-400">{message}</p>
    </div>
  );
}

function UpcomingCard({
  record,
  onClick,
}: {
  record: RecordItem;
  onClick: () => void;
}) {
  const daysLeft = Math.ceil(
    (new Date(record.deadline).getTime() - Date.now()) / 86400000,
  );
  const urgent = daysLeft <= 2;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "dash-task-card group flex w-full items-start gap-3 p-4 text-right",
        urgent && "border-amber-500/40",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          urgent
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            : "bg-brand-500/10 text-brand-600 dark:text-brand-400",
        )}
      >
        <Clock className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-steel-800 dark:text-steel-100">
          {record.subject}
        </p>
        <p className="mt-1 truncate text-xs text-steel-500">{record.assignee}</p>
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
            urgent
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "bg-steel-500/10 text-steel-600 dark:text-steel-400",
          )}
        >
          {relativeDeadline(record.deadline)}
        </span>
      </div>
    </button>
  );
}

function StatusLegend() {
  const items: { status: Parameters<typeof StatusBadge>[0]["status"] }[] = [
    { status: "new" },
    { status: "active" },
    { status: "done" },
    { status: "closed" },
    { status: "overdue" },
    { status: "info" },
  ];
  return (
    <Card className="border-dashed border-steel-200/80 bg-steel-50/50 p-4 dark:border-steel-700/60 dark:bg-steel-900/40">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
        <span className="text-xs font-bold text-steel-400">دليل الحالات:</span>
        {items.map((i) => (
          <StatusBadge key={i.status} status={i.status} />
        ))}
      </div>
    </Card>
  );
}
