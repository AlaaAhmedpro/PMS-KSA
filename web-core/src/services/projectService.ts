import type { Project, ProjectStatus, TaskItem } from "../models/domain";
import { demoDelay } from "../demo-mode/config";

const ALLOWED: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["planned", "cancelled"],
  planned: ["active", "cancelled", "draft"],
  active: ["on_hold", "completed", "cancelled"],
  on_hold: ["active", "cancelled"],
  completed: [],
  cancelled: [],
};

export class ProjectServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectServiceError";
  }
}

export function validateProjectInput(input: {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  budgetSar: number;
}): void {
  if (!input.name.trim()) throw new ProjectServiceError("اسم المشروع مطلوب.");
  if (!input.code.trim()) throw new ProjectServiceError("رمز المشروع مطلوب.");
  if (!input.startDate || !input.endDate) {
    throw new ProjectServiceError("تاريخ البداية والنهاية مطلوبان.");
  }
  if (input.endDate < input.startDate) {
    throw new ProjectServiceError("تاريخ النهاية يجب أن يكون بعد تاريخ البداية.");
  }
  if (input.budgetSar < 0) throw new ProjectServiceError("الميزانية غير صحيحة.");
}

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function availableTransitions(from: ProjectStatus): ProjectStatus[] {
  return ALLOWED[from] ?? [];
}

export function assertTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (!canTransition(from, to)) {
    throw new ProjectServiceError(`لا يمكن الانتقال من «${from}» إلى «${to}».`);
  }
}

export function recalcProjectProgress(tasks: TaskItem[]): number {
  // المهام الجذرية فقط — الفرعية تدخل عبر rollup داخل المهمة الأب
  const roots = tasks.filter(
    (t) => !t.parentTaskId && t.status !== "cancelled",
  );
  if (!roots.length) return 0;
  const sum = roots.reduce((acc, t) => acc + (t.progress || 0), 0);
  return Math.round(sum / roots.length);
}

export function isTaskOverdue(task: TaskItem, today = new Date().toISOString().slice(0, 10)): boolean {
  if (task.status === "done" || task.status === "cancelled") return false;
  return task.dueDate < today;
}

export async function saveProjectSimulated(): Promise<void> {
  await demoDelay();
}

export function filterProjectsForUser(
  projects: Project[],
  opts: {
    role: string;
    userId: string;
    scopedProjectIds?: string[];
  },
): Project[] {
  if (opts.role === "org_admin" || opts.role === "executive") return projects;
  if (opts.role === "external") {
    const ids = new Set(opts.scopedProjectIds ?? []);
    return projects.filter((p) => ids.has(p.id));
  }
  if (opts.role === "project_manager") {
    return projects.filter(
      (p) => p.managerUserId === opts.userId || p.memberUserIds.includes(opts.userId),
    );
  }
  return projects.filter((p) => p.memberUserIds.includes(opts.userId) || p.managerUserId === opts.userId);
}
