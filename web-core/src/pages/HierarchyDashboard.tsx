import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { KpiCard } from "../components/common/KpiCard";
import { Card, CardHeader } from "../components/ui/Card";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useOrgModules } from "../hooks/useOrgModules";
import { filterProjectsForUser, isTaskOverdue } from "../services/projectService";
import { PROJECT_STATUS_LABELS } from "../lib/constants";
import { formatNumber } from "../lib/format";

export function HierarchyDashboard() {
  const { projects, tasks, portfolios, programs, organization } = useHierarchy();
  const { user } = useAuth();
  const { modules, showStrategicNav } = useOrgModules();

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

  const active = scopedProjects.filter((p) => p.status === "active").length;
  const completed = scopedProjects.filter((p) => p.status === "completed").length;
  const overdueTasks = scopedTasks.filter((t) => isTaskOverdue(t)).length;
  const avgProgress =
    scopedProjects.length === 0
      ? 0
      : Math.round(
          scopedProjects.reduce((a, p) => a + p.progress, 0) / scopedProjects.length,
        );

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة الإدارة"
        subtitle={`${organization?.name ?? ""} — مؤشرات مشتقة من بيانات الهرمية`}
        icon={<LayoutDashboard className="h-6 w-6" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          featured
          label="المشاريع في النطاق"
          value={formatNumber(scopedProjects.length)}
          tone="steel"
          hint={`${active} نشط · ${completed} مكتمل`}
          icon={<LayoutDashboard className="h-5 w-5" />}
        />
        <KpiCard
          label="متوسط التقدم"
          value={`${avgProgress}%`}
          tone="brand"
          hint="من مهام المشاريع"
          icon={<LayoutDashboard className="h-5 w-5" />}
        />
        <KpiCard
          label="مهام متأخرة"
          value={formatNumber(overdueTasks)}
          tone="red"
          hint={`من ${scopedTasks.length} مهمة`}
          icon={<LayoutDashboard className="h-5 w-5" />}
          pulse={overdueTasks > 0}
        />
        {showStrategicNav && (modules.portfolio || modules.program) ? (
          <KpiCard
            label="المحافظ / البرامج"
            value={`${modules.portfolio ? portfolios.length : "—"} / ${modules.program ? programs.length : "—"}`}
            tone="sky"
            hint="على مستوى المؤسسة"
            icon={<LayoutDashboard className="h-5 w-5" />}
          />
        ) : (
          <KpiCard
            label="مشاريع نشطة"
            value={formatNumber(active)}
            tone="sky"
            hint={`${completed} مكتمل`}
            icon={<LayoutDashboard className="h-5 w-5" />}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <CardHeader title="أحدث المشاريع" subtitle="حسب تاريخ الإنشاء" />
          <ul className="mt-3 space-y-2">
            {[...scopedProjects]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 6)
              .map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between rounded-xl bg-steel-50 px-3 py-2.5 text-sm hover:bg-steel-100 dark:bg-steel-800/50 dark:hover:bg-steel-800"
                  >
                    <span className="font-semibold text-steel-800 dark:text-steel-100">
                      {p.name}
                    </span>
                    <span className="text-xs text-steel-500">
                      {PROJECT_STATUS_LABELS[p.status]} · {p.progress}%
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </Card>

        <Card className="p-4">
          <CardHeader title="مهام قادمة / متأخرة" subtitle="أعلى أولوية للمتابعة" />
          <ul className="mt-3 space-y-2">
            {[...scopedTasks]
              .filter((t) => t.status !== "done" && t.status !== "cancelled")
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 6)
              .map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-steel-200 px-3 py-2.5 text-sm dark:border-steel-700"
                >
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-xs text-steel-500">
                    {projects.find((p) => p.id === t.projectId)?.name} · {t.dueDate}
                    {isTaskOverdue(t) ? " · متأخرة" : ""}
                  </p>
                </li>
              ))}
          </ul>
          <Link
            to="/tasks"
            className="mt-3 inline-flex text-sm font-bold text-brand-600 hover:underline"
          >
            مهامي
          </Link>
        </Card>
      </div>
    </div>
  );
}
