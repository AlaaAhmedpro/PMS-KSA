import type {
  Milestone,
  ProjectCategory,
  StageStatus,
  TaskItem,
  TaskStatus,
} from "../models/domain";

/** تقدّم مفروض من حالة المهمة / الفرعية */
export function progressFromTaskStatus(
  status: TaskStatus,
  current: number,
): number {
  if (status === "done") return 100;
  if (status === "todo" || status === "cancelled") return 0;
  if (status === "blocked") return current;
  // in_progress
  return current > 0 ? current : 10;
}

/** بعد تغيير حالة مهمة فرعية أو مهمة: إعادة احتساب تقدّم الآباء */
export function rollupProjectTasks(
  all: TaskItem[],
  projectId: string,
): TaskItem[] {
  const projectTasks = all.filter((t) => t.projectId === projectId);

  // 1) أوراق (بدون أبناء): تقدّم من الحالة
  let next = all.map((t) => {
    if (t.projectId !== projectId) return t;
    const hasKids = projectTasks.some((k) => k.parentTaskId === t.id);
    if (hasKids) return t;
    return {
      ...t,
      progress: progressFromTaskStatus(t.status, t.progress),
    };
  });

  // 2) آباء: متوسط تقدّم الأبناء غير الملغاة + حالة مشتقة عند الحاجة
  next = next.map((t) => {
    if (t.projectId !== projectId) return t;
    const kids = next.filter(
      (k) => k.parentTaskId === t.id && k.status !== "cancelled",
    );
    if (!kids.length) return t;

    const progress = Math.round(
      kids.reduce((sum, k) => sum + (k.progress || 0), 0) / kids.length,
    );

    let status: TaskStatus = t.status;
    if (kids.every((k) => k.status === "done")) {
      status = "done";
    } else if (kids.every((k) => k.status === "cancelled")) {
      status = "cancelled";
    } else if (
      status === "todo" &&
      kids.some((k) => k.status === "in_progress" || k.status === "done")
    ) {
      status = "in_progress";
    } else if (status === "done" && progress < 100) {
      status = "in_progress";
    }

    return {
      ...t,
      progress: status === "done" ? 100 : progress,
      status,
    };
  });

  return next;
}

export function rootTasksForProject(
  tasks: TaskItem[],
  projectId: string,
): TaskItem[] {
  return tasks.filter(
    (t) =>
      t.projectId === projectId &&
      !t.parentTaskId &&
      t.status !== "cancelled",
  );
}

export function categoryProgress(
  categoryId: string,
  tasks: TaskItem[],
): number {
  const roots = tasks.filter(
    (t) =>
      t.categoryId === categoryId &&
      !t.parentTaskId &&
      t.status !== "cancelled",
  );
  if (!roots.length) return 0;
  return Math.round(
    roots.reduce((s, t) => s + (t.progress || 0), 0) / roots.length,
  );
}

export function stageTaskProgress(
  stage: Milestone,
  categories: ProjectCategory[],
  tasks: TaskItem[],
): number {
  const catIds = new Set(
    categories.filter((c) => c.stageId === stage.id).map((c) => c.id),
  );
  const roots = tasks.filter(
    (t) =>
      t.projectId === stage.projectId &&
      !t.parentTaskId &&
      t.status !== "cancelled" &&
      (t.categoryId
        ? catIds.has(t.categoryId)
        : t.milestoneId === stage.id),
  );
  if (!roots.length) return 0;
  return Math.round(
    roots.reduce((s, t) => s + (t.progress || 0), 0) / roots.length,
  );
}

export function withStageStatus(
  patch: Partial<Milestone> & { status?: StageStatus },
): Partial<Milestone> {
  if (!patch.status) return patch;
  return {
    ...patch,
    completed: patch.status === "completed",
  };
}

export function normalizeStageStatus(m: Milestone): StageStatus {
  if (m.status) return m.status;
  return m.completed ? "completed" : "active";
}
