import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ListTodo } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Input, NativeSelect } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Pagination } from "../components/ui/Pagination";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { usePagination } from "../hooks/usePagination";
import { TASK_STATUS_LABELS } from "../lib/constants";
import { isTaskOverdue } from "../services/projectService";
import type { Priority, TaskItem, TaskStatus } from "../models/domain";
import { cn } from "../lib/cn";

type StatusFilter = "all" | "active" | "overdue" | "done";

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  critical: "حرجة",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  low: "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:text-steel-300",
  normal:
    "border-steel-200 bg-white text-steel-600 dark:border-steel-700 dark:bg-steel-900 dark:text-steel-300",
  high: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:text-amber-200",
  critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:text-red-300",
};

const STATUS_BADGE: Record<string, string> = {
  todo: "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:text-steel-300",
  in_progress:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:text-sky-300",
  blocked:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:text-amber-200",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:text-red-300",
};

function taskRank(t: TaskItem): number {
  if (isTaskOverdue(t)) return 0;
  if (t.status === "blocked") return 1;
  if (t.status === "in_progress") return 2;
  if (t.status === "todo") return 3;
  if (t.status === "done") return 4;
  return 5;
}

export function TasksPage() {
  const { tasks, projects, milestones, projectCategories, updateTask } =
    useHierarchy();
  const { user } = useAuth();
  const can = useCan();
  const canUpdate =
    Boolean(user) &&
    (can.execute(user?.role) || can.manageRecords(user?.role));

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const myTasks = useMemo(() => {
    if (!user) return [];
    return tasks
      .filter((t) => t.assigneeUserId === user.id)
      .sort((a, b) => {
        const r = taskRank(a) - taskRank(b);
        if (r !== 0) return r;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [tasks, user]);

  const counts = useMemo(() => {
    const active = myTasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled",
    ).length;
    const overdue = myTasks.filter((t) => isTaskOverdue(t)).length;
    const done = myTasks.filter((t) => t.status === "done").length;
    return { all: myTasks.length, active, overdue, done };
  }, [myTasks]);

  const filtered = useMemo(() => {
    const term = q.trim();
    return myTasks.filter((t) => {
      if (tab === "active") {
        if (t.status === "done" || t.status === "cancelled") return false;
      } else if (tab === "overdue") {
        if (!isTaskOverdue(t)) return false;
      } else if (tab === "done") {
        if (t.status !== "done") return false;
      }
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (!term) return true;
      const projectName =
        projects.find((p) => p.id === t.projectId)?.name ?? "";
      const parentTitle =
        tasks.find((x) => x.id === t.parentTaskId)?.title ?? "";
      return (
        t.title.includes(term) ||
        t.description.includes(term) ||
        projectName.includes(term) ||
        parentTitle.includes(term)
      );
    });
  }, [myTasks, tab, q, priorityFilter, projects, tasks]);

  const { page, setPage, totalPages, paginated, total, rangeStart, rangeEnd } =
    usePagination(filtered, 10, [q, tab, priorityFilter]);

  const resolveContext = (
    projectId: string,
    categoryId?: string,
    milestoneId?: string,
  ) => {
    const category = categoryId
      ? projectCategories.find((c) => c.id === categoryId)
      : undefined;
    const stageId = category?.stageId ?? milestoneId;
    const stage = stageId
      ? milestones.find((m) => m.id === stageId && m.projectId === projectId)
      : undefined;
    const parts = [stage?.name, category?.name].filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  };

  const tabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "الكل", count: counts.all },
    { id: "active", label: "قيد العمل", count: counts.active },
    { id: "overdue", label: "متأخرة", count: counts.overdue },
    { id: "done", label: "منجزة", count: counts.done },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="مهامي"
        subtitle={
          user
            ? `قائمة عملك الشخصية — ${user.name}`
            : "تعذّر تحديد المستخدم الحالي"
        }
        icon={<ListTodo className="h-6 w-6" />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="قيد العمل"
          value={counts.active}
          hint="مهام لم تُنجز بعد"
          active={tab === "active"}
          onClick={() => {
            setTab("active");
            setPage(1);
          }}
        />
        <SummaryTile
          label="متأخرة"
          value={counts.overdue}
          hint="تجاوزت تاريخ الاستحقاق"
          tone={counts.overdue > 0 ? "danger" : "default"}
          active={tab === "overdue"}
          onClick={() => {
            setTab("overdue");
            setPage(1);
          }}
        />
        <SummaryTile
          label="منجزة"
          value={counts.done}
          hint="أُغلقت بنجاح"
          tone="success"
          active={tab === "done"}
          onClick={() => {
            setTab("done");
            setPage(1);
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
              tab === t.id
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-steel-200 text-steel-600 hover:bg-steel-50 dark:border-steel-700 dark:text-steel-300",
            )}
          >
            {t.label}
            <span
              className={cn(
                "ms-1.5 tabular-nums",
                tab === t.id ? "text-white/90" : "text-steel-400",
              )}
            >
              ({t.count})
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="بحث بالعنوان أو المشروع أو المهمة الأب"
          aria-label="بحث في مهامي"
        />
        <SearchableSelect
          value={priorityFilter}
          onChange={(v) => {
            setPriorityFilter(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "كل الأولويات" },
            ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[960px] table-fixed text-sm">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">المهمة</th>
              <th className="px-4 py-3 text-start font-bold">المشروع</th>
              <th className="px-4 py-3 text-start font-bold">المرحلة / الفئة</th>
              <th className="px-4 py-3 text-start font-bold">الأولوية</th>
              <th className="px-4 py-3 text-start font-bold">الحالة</th>
              <th className="px-4 py-3 text-start font-bold">التقدّم</th>
              <th className="px-4 py-3 text-start font-bold">الاستحقاق</th>
            </tr>
          </thead>
          <tbody>
            {total === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  لا مهام مطابقة للبحث أو التصفية.
                </td>
              </tr>
            ) : (
              paginated.map((t) => {
                const project = projects.find((p) => p.id === t.projectId);
                const parent = t.parentTaskId
                  ? tasks.find((x) => x.id === t.parentTaskId)
                  : undefined;
                const overdue = isTaskOverdue(t);
                return (
                  <tr
                    key={t.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-4 py-3 align-middle">
                      <Link
                        to={`/projects/${t.projectId}#stages`}
                        className="block truncate font-semibold text-brand-700 hover:underline"
                        title={t.title}
                      >
                        {t.title}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px] text-steel-400">
                        {t.parentTaskId ? (
                          <>
                            فرعية
                            {parent ? ` · ضمن: ${parent.title}` : null}
                          </>
                        ) : (
                          "مهمة أصلية"
                        )}
                        {overdue && t.status !== "done" ? (
                          <span className="ms-1.5 font-bold text-red-600">
                            · متأخرة
                          </span>
                        ) : null}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link
                        to={`/projects/${t.projectId}`}
                        className="block truncate font-semibold text-brand-700 hover:underline"
                        title={project?.name}
                      >
                        {project?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="block truncate text-steel-700 dark:text-steel-200">
                        {resolveContext(
                          t.projectId,
                          t.categoryId,
                          t.milestoneId,
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={cn(
                          "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-bold",
                          PRIORITY_BADGE[t.priority],
                        )}
                      >
                        {PRIORITY_LABELS[t.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {canUpdate ? (
                        <NativeSelect
                          value={t.status}
                          onChange={(e) => {
                            const status = e.target.value as TaskStatus;
                            updateTask(t.id, {
                              status,
                              progress: status === "done" ? 100 : t.progress,
                            });
                          }}
                          className="min-w-[7.5rem]"
                          aria-label={`حالة ${t.title}`}
                        >
                          {Object.entries(TASK_STATUS_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </NativeSelect>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-bold",
                            STATUS_BADGE[t.status] ?? STATUS_BADGE.todo,
                          )}
                        >
                          {TASK_STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 rounded-full bg-steel-100 dark:bg-steel-800">
                          <div
                            className="h-1.5 rounded-full bg-brand-500"
                            style={{
                              width: `${Math.min(100, Math.max(0, t.progress))}%`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 tabular-nums text-[11px] text-steel-500">
                          {t.progress}%
                        </span>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 align-middle tabular-nums text-[12px]",
                        overdue && t.status !== "done"
                          ? "font-bold text-red-600"
                          : "text-steel-700 dark:text-steel-200",
                      )}
                    >
                      {t.dueDate}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone = "default",
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "danger" | "success";
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border bg-white px-4 py-3 text-start transition-transform duration-150 hover:-translate-y-px dark:bg-steel-900",
        active
          ? "border-brand-300 shadow-card"
          : "border-steel-200 dark:border-steel-700",
      )}
    >
      <p className="text-[11px] font-bold text-steel-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-extrabold tabular-nums",
          tone === "danger" && value > 0
            ? "text-red-600"
            : tone === "success"
              ? "text-emerald-700"
              : "text-steel-800 dark:text-steel-100",
        )}
      >
        {value}
      </p>
      <p className="mt-1 border-t border-steel-100 pt-1.5 text-[11px] text-steel-400 dark:border-steel-800">
        {hint}
      </p>
    </button>
  );
}
