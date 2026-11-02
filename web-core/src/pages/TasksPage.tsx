import { useMemo, useState } from "react";
import { ListTodo, Plus } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { TASK_STATUS_LABELS } from "../lib/constants";
import { filterProjectsForUser, isTaskOverdue } from "../services/projectService";
import type { TaskStatus } from "../models/domain";
import { usePagination } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";

export function TasksPage() {
  const { tasks, projects, milestones, addTask, updateTask } = useHierarchy();
  const { user, users } = useAuth();
  const can = useCan();
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    projectId: "",
    milestoneId: "",
    dueDate: "",
    assigneeUserId: user?.id ?? "",
  });
  const [error, setError] = useState("");

  const allowedProjects = useMemo(
    () =>
      filterProjectsForUser(projects, {
        role: String(user?.role ?? ""),
        userId: user?.id ?? "",
        scopedProjectIds: user?.scopedProjectIds,
      }),
    [projects, user],
  );

  const allowedIds = useMemo(
    () => new Set(allowedProjects.map((p) => p.id)),
    [allowedProjects],
  );

  const scopedTasks = useMemo(
    () => tasks.filter((t) => allowedIds.has(t.projectId)),
    [tasks, allowedIds],
  );

  const filtered = useMemo(() => {
    const term = q.trim();
    if (!term) return scopedTasks;
    return scopedTasks.filter((t) => t.title.includes(term) || t.description.includes(term));
  }, [scopedTasks, q]);

  const { page, setPage, totalPages, paginated, total, rangeStart, rangeEnd } =
    usePagination(filtered, 10, [q]);

  const create = () => {
    setError("");
    if (!form.title.trim() || !form.projectId || !form.dueDate) {
      setError("العنوان والمشروع وتاريخ الاستحقاق مطلوبة.");
      return;
    }
    addTask({
      projectId: form.projectId,
      milestoneId: form.milestoneId || undefined,
      title: form.title.trim(),
      description: "",
      status: "todo",
      priority: "normal",
      assigneeUserId: form.assigneeUserId || undefined,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: form.dueDate,
      progress: 0,
    });
    setShowForm(false);
    setForm((f) => ({ ...f, title: "", dueDate: "" }));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="المهام والمعالم"
        subtitle={`${total} مهمة في نطاقك`}
        icon={<ListTodo className="h-6 w-6" />}
        actions={
          can.execute(user?.role) || can.manageRecords(user?.role) ? (
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4" />
              مهمة جديدة
            </Button>
          ) : undefined
        }
      />

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث في المهام…"
      />

      {showForm && (
        <Card className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="العنوان" required>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="المشروع" required>
              <SearchableSelect
                value={form.projectId}
                onChange={(v) => setForm({ ...form, projectId: v, milestoneId: "" })}
                options={allowedProjects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </Field>
            <Field label="المعلم">
              <SearchableSelect
                value={form.milestoneId}
                onChange={(v) => setForm({ ...form, milestoneId: v })}
                options={[
                  { value: "", label: "بدون معلم" },
                  ...milestones
                    .filter((m) => m.projectId === form.projectId)
                    .map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
            </Field>
            <Field label="المسؤول">
              <SearchableSelect
                value={form.assigneeUserId}
                onChange={(v) => setForm({ ...form, assigneeUserId: v })}
                options={users.map((u) => ({ value: u.id, label: u.name }))}
              />
            </Field>
            <Field label="الاستحقاق" required>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={create}>حفظ المهمة</Button>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">المهمة</th>
              <th className="px-4 py-3 text-start font-bold">المشروع</th>
              <th className="px-4 py-3 text-start font-bold">الحالة</th>
              <th className="px-4 py-3 text-start font-bold">الاستحقاق</th>
              <th className="px-4 py-3 text-start font-bold">تحديث</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((t) => (
              <tr key={t.id} className="border-b border-steel-100 dark:border-steel-800">
                <td className="px-4 py-3">
                  <p className="font-semibold">{t.title}</p>
                  {t.parentTaskId && (
                    <p className="text-[10px] text-steel-400">مهمة فرعية</p>
                  )}
                  {isTaskOverdue(t) && (
                    <p className="text-[10px] font-bold text-red-500">متأخرة</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {projects.find((p) => p.id === t.projectId)?.name ?? "—"}
                </td>
                <td className="px-4 py-3">{TASK_STATUS_LABELS[t.status]}</td>
                <td className="px-4 py-3 tabular-nums">{t.dueDate}</td>
                <td className="px-4 py-3">
                  {(can.execute(user?.role) || can.manageRecords(user?.role)) && (
                    <SearchableSelect
                      value={t.status}
                      onChange={(v) =>
                        updateTask(t.id, {
                          status: v as TaskStatus,
                          progress: v === "done" ? 100 : t.progress,
                        })
                      }
                      options={Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      className="min-w-[120px]"
                    />
                  )}
                </td>
              </tr>
            ))}
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
