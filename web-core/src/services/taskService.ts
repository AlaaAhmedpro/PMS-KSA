import type { TaskItem, TaskStatus } from "../models/domain";
import { demoDelay } from "../demo-mode/config";

export class TaskServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskServiceError";
  }
}

export function validateTaskInput(input: {
  title: string;
  projectId: string;
  startDate: string;
  dueDate: string;
}): void {
  if (!input.title.trim()) throw new TaskServiceError("عنوان المهمة مطلوب.");
  if (!input.projectId) throw new TaskServiceError("المشروع مطلوب.");
  if (!input.startDate || !input.dueDate) {
    throw new TaskServiceError("تاريخ البداية والاستحقاق مطلوبان.");
  }
  if (input.dueDate < input.startDate) {
    throw new TaskServiceError("تاريخ الاستحقاق يجب أن يكون بعد البداية.");
  }
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === "done" || status === "cancelled";
}

export async function saveTaskSimulated(_row?: TaskItem): Promise<void> {
  await demoDelay(120);
}
