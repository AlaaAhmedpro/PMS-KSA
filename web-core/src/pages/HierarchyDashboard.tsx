import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { KpiCard } from "../components/common/KpiCard";
import { Card, CardHeader } from "../components/ui/Card";
import {
  BudgetCompareChart,
  CategoryPieChart,
} from "../components/charts/Charts";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { filterProjectsForUser, isTaskOverdue } from "../services/projectService";
import { PROJECT_STATUS_LABELS } from "../lib/constants";
import { formatNumber, formatShortDate } from "../lib/format";
import type { Project } from "../models/domain";

type AttentionRow = {
  id: string;
  kind: "task" | "project";
  name: string;
  detail: string;
  meta: string;
  href: string;
};

function shortName(name: string, max = 18): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function HierarchyDashboard() {
  const { projects, tasks, organization } = useHierarchy();
  const { user } = useAuth();

  const scopedProjects = useMemo(
    () =>
      filterProjectsForUser(projects, {
        role: String(user?.role ?? ""),
        userId: user?.id ?? "",
        scopedProjectIds: user?.scopedProjectIds,
      }),
    [projects, user],
  );

  const scopedIds = useMemo(
    () => new Set(scopedProjects.map((p) => p.id)),
    [scopedProjects],
  );

  const scopedTasks = useMemo(
    () => tasks.filter((t) => scopedIds.has(t.projectId)),
    [tasks, scopedIds],
  );

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of scopedProjects) map.set(p.id, p.name);
    return map;
  }, [scopedProjects]);

  const active = scopedProjects.filter((p) => p.status === "active").length;
  const completed = scopedProjects.filter((p) => p.status === "completed").length;
  const overdueTaskList = useMemo(
    () => scopedTasks.filter((t) => isTaskOverdue(t)),
    [scopedTasks],
  );
  const overdueTasks = overdueTaskList.length;

  const avgProgress =
    scopedProjects.length === 0
      ? 0
      : Math.round(
          scopedProjects.reduce((a, p) => a + p.progress, 0) / scopedProjects.length,
        );

  const budgetTotals = useMemo(() => {
    const budget = scopedProjects.reduce((a, p) => a + (p.budgetSar || 0), 0);
    const spent = scopedProjects.reduce((a, p) => a + (p.spentSar || 0), 0);
    const burnPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    return { budget, spent, burnPct };
  }, [scopedProjects]);

  const statusChartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of scopedProjects) {
      const label = PROJECT_STATUS_LABELS[p.status] ?? p.status;
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [scopedProjects]);

  const budgetChartData = useMemo(
    () =>
      [...scopedProjects]
        .filter((p) => (p.budgetSar || 0) > 0)
        .sort((a, b) => (b.budgetSar || 0) - (a.budgetSar || 0))
        .slice(0, 6)
        .map((p) => ({
          name: shortName(p.name),
          ميزانية: p.budgetSar || 0,
          منصرف: p.spentSar || 0,
        })),
    [scopedProjects],
  );

  const attentionRows = useMemo(() => {
    const rows: AttentionRow[] = [];
    const overdueProjectIds = new Set(overdueTaskList.map((t) => t.projectId));

    const attentionProjects = scopedProjects.filter(
      (p: Project) =>
        p.status === "on_hold" ||
        p.priority === "critical" ||
        (p.progress < 40 &&
          p.status === "active" &&
          overdueProjectIds.has(p.id)),
    );

    for (const p of attentionProjects) {
      const reason =
        p.status === "on_hold"
          ? PROJECT_STATUS_LABELS.on_hold
          : p.priority === "critical"
            ? "أولوية حرجة"
            : `تقدم ${p.progress}% مع مهام متأخرة`;
      rows.push({
        id: `project-${p.id}`,
        kind: "project",
        name: p.name,
        detail: reason,
        meta: `${PROJECT_STATUS_LABELS[p.status] ?? p.status} · ${p.progress}%`,
        href: `/projects/${p.id}`,
      });
    }

    for (const t of overdueTaskList) {
      rows.push({
        id: `task-${t.id}`,
        kind: "task",
        name: t.title,
        detail: projectNameById.get(t.projectId) ?? "—",
        meta: `استحقاق ${formatShortDate(t.dueDate)}`,
        href: `/tasks`,
      });
    }

    const rank = (r: AttentionRow) => (r.kind === "task" ? 0 : 1);
    return rows.sort((a, b) => rank(a) - rank(b)).slice(0, 10);
  }, [scopedProjects, overdueTaskList, projectNameById]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة الإدارة"
        subtitle={`${organization?.name ?? ""} — نظرة سريعة على المشاريع والمهام والميزانية`}
        icon={<LayoutDashboard className="h-6 w-6" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          featured
          label="المشاريع في النطاق"
          value={formatNumber(scopedProjects.length)}
          tone="steel"
          hint={`${active} نشط · ${completed} مكتمل`}
        />
        <KpiCard
          label="متوسط التقدم"
          value={`${avgProgress}%`}
          tone="brand"
          hint="عبر مشاريع النطاق"
        />
        <KpiCard
          label="مهام متأخرة"
          value={formatNumber(overdueTasks)}
          tone="red"
          hint={`من ${formatNumber(scopedTasks.length)} مهمة`}
          pulse={overdueTasks > 0}
        />
        <KpiCard
          label="صرف الميزانية"
          value={`${budgetTotals.burnPct}%`}
          tone="sky"
          hint={
            budgetTotals.budget > 0
              ? `${formatNumber(budgetTotals.spent)} من ${formatNumber(budgetTotals.budget)} ر.س`
              : "لا ميزانيات مسجّلة"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <CardHeader title="توزيع حالات المشاريع" subtitle="حسب الحالة الحالية" />
          {statusChartData.length === 0 ? (
            <p className="mt-8 text-center text-sm text-steel-400">
              لا توجد مشاريع لعرض التوزيع.
            </p>
          ) : (
            <div className="mt-2">
              <CategoryPieChart data={statusChartData} />
            </div>
          )}
        </Card>

        <Card className="p-4">
          <CardHeader
            title="الميزانية والمنصرف"
            subtitle="أعلى مشاريع من حيث الميزانية"
          />
          {budgetChartData.length === 0 ? (
            <p className="mt-8 text-center text-sm text-steel-400">
              لا توجد ميزانيات مشاريع للعرض.
            </p>
          ) : (
            <div className="mt-2">
              <BudgetCompareChart data={budgetChartData} />
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <CardHeader
          title="يحتاج انتباهاً"
          subtitle="مهام متأخرة ومشاريع حرجة أو موقوفة"
          action={
            <Link
              to="/tasks"
              className="text-sm font-bold text-brand-600 hover:underline"
            >
              المهام
            </Link>
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-steel-200 text-start dark:border-steel-700">
                <th className="px-2 py-2 font-bold">النوع</th>
                <th className="px-2 py-2 font-bold">الاسم</th>
                <th className="px-2 py-2 font-bold">التفاصيل</th>
                <th className="px-2 py-2 font-bold">الحالة / الاستحقاق</th>
                <th className="px-2 py-2 font-bold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {attentionRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-2 py-6 text-center text-steel-400"
                  >
                    لا توجد عناصر تحتاج انتباهاً حالياً.
                  </td>
                </tr>
              ) : (
                attentionRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-2 py-2 text-steel-500">
                      {row.kind === "task" ? "مهمة" : "مشروع"}
                    </td>
                    <td className="px-2 py-2 font-semibold text-steel-800 dark:text-steel-100">
                      {row.name}
                    </td>
                    <td className="px-2 py-2 text-steel-600 dark:text-steel-300">
                      {row.detail}
                    </td>
                    <td className="px-2 py-2 text-steel-500">{row.meta}</td>
                    <td className="px-2 py-2">
                      <Link
                        to={row.href}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
