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
import { useLocale } from "../store/LocaleContext";
import { filterProjectsForUser, isTaskOverdue } from "../services/projectService";
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
  const text = name.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function HierarchyDashboard() {
  const { t } = useLocale();
  const { projects, tasks, organization } = useHierarchy();
  const { user } = useAuth();

  const projectStatusLabel = (status: string) => {
    const key = `status.project.${status}`;
    const label = t(key);
    return label === key ? status : label;
  };

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
    () => tasks.filter((task) => scopedIds.has(task.projectId)),
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
    () => scopedTasks.filter((task) => isTaskOverdue(task)),
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
      const label = projectStatusLabel(p.status);
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [scopedProjects, t]);

  const budgetChartData = useMemo(
    () =>
      [...scopedProjects]
        .filter((p) => (p.budgetSar || 0) > 0)
        .sort((a, b) => (b.budgetSar || 0) - (a.budgetSar || 0))
        .slice(0, 6)
        .map((p) => ({
          name: shortName(p.name),
          budget: p.budgetSar || 0,
          spent: p.spentSar || 0,
        })),
    [scopedProjects],
  );

  const attentionRows = useMemo(() => {
    const rows: AttentionRow[] = [];
    const overdueProjectIds = new Set(overdueTaskList.map((task) => task.projectId));

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
          ? projectStatusLabel("on_hold")
          : p.priority === "critical"
            ? t("dash.attention.criticalPriority")
            : t("dash.attention.lowProgress", { pct: p.progress });
      rows.push({
        id: `project-${p.id}`,
        kind: "project",
        name: p.name,
        detail: reason,
        meta: `${projectStatusLabel(p.status)} · ${p.progress}%`,
        href: `/projects/${p.id}`,
      });
    }

    for (const task of overdueTaskList) {
      rows.push({
        id: `task-${task.id}`,
        kind: "task",
        name: task.title,
        detail: projectNameById.get(task.projectId) ?? "—",
        meta: t("dash.attention.due", { date: formatShortDate(task.dueDate) }),
        href: `/tasks`,
      });
    }

    const rank = (r: AttentionRow) => (r.kind === "task" ? 0 : 1);
    return rows.sort((a, b) => rank(a) - rank(b)).slice(0, 10);
  }, [scopedProjects, overdueTaskList, projectNameById, t]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dash.title")}
        subtitle={t("dash.subtitle", { org: organization?.name ?? "" })}
        icon={<LayoutDashboard className="h-6 w-6" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          featured
          label={t("dash.kpi.projects")}
          value={formatNumber(scopedProjects.length)}
          tone="steel"
          hint={t("dash.kpi.projectsHint", { active, completed })}
        />
        <KpiCard
          label={t("dash.kpi.avgProgress")}
          value={`${avgProgress}%`}
          tone="brand"
          hint={t("dash.kpi.avgProgressHint")}
        />
        <KpiCard
          label={t("dash.kpi.overdueTasks")}
          value={formatNumber(overdueTasks)}
          tone="red"
          hint={t("dash.kpi.overdueTasksHint", { total: formatNumber(scopedTasks.length) })}
          pulse={overdueTasks > 0}
        />
        <KpiCard
          label={t("dash.kpi.budgetBurn")}
          value={`${budgetTotals.burnPct}%`}
          tone="sky"
          hint={
            budgetTotals.budget > 0
              ? t("dash.kpi.budgetBurnHint", {
                  spent: formatNumber(budgetTotals.spent),
                  budget: formatNumber(budgetTotals.budget),
                })
              : t("dash.kpi.noBudgets")
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <CardHeader title={t("dash.chart.statusTitle")} subtitle={t("dash.chart.statusSub")} />
          {statusChartData.length === 0 ? (
            <p className="mt-8 text-center text-sm text-steel-400">
              {t("dash.chart.statusEmpty")}
            </p>
          ) : (
            <div className="mt-2">
              <CategoryPieChart data={statusChartData} />
            </div>
          )}
        </Card>

        <Card className="p-4">
          <CardHeader
            title={t("dash.chart.budgetTitle")}
            subtitle={t("dash.chart.budgetSub")}
          />
          {budgetChartData.length === 0 ? (
            <p className="mt-8 text-center text-sm text-steel-400">
              {t("dash.chart.budgetEmpty")}
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
          title={t("dash.attention.title")}
          subtitle={t("dash.attention.sub")}
          action={
            <Link
              to="/tasks"
              className="text-sm font-bold text-brand-600 hover:underline"
            >
              {t("dash.attention.tasksLink")}
            </Link>
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-steel-200 text-start dark:border-steel-700">
                <th className="px-2 py-2 font-bold">{t("dash.attention.colType")}</th>
                <th className="px-2 py-2 font-bold">{t("dash.attention.colName")}</th>
                <th className="px-2 py-2 font-bold">{t("dash.attention.colDetail")}</th>
                <th className="px-2 py-2 font-bold">{t("dash.attention.colMeta")}</th>
                <th className="px-2 py-2 font-bold">{t("dash.attention.colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {attentionRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-2 py-6 text-center text-steel-400"
                  >
                    {t("dash.attention.empty")}
                  </td>
                </tr>
              ) : (
                attentionRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-2 py-2 text-steel-500">
                      {row.kind === "task" ? t("kind.task") : t("kind.project")}
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
                        {t("dash.attention.open")}
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
