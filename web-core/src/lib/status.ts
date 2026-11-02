import { daysUntil } from "./format";
import type { RecordItem, Status } from "./types";

/**
 * Effective status: a record that passed its deadline without being
 * done/closed/info becomes "overdue" automatically.
 */
export function effectiveStatus(r: RecordItem): Status {
  if (r.status === "done" || r.status === "closed" || r.status === "info") {
    return r.status;
  }
  if (daysUntil(r.deadline) < 0) return "overdue";
  return r.status;
}

export function isOpen(r: RecordItem): boolean {
  const s = effectiveStatus(r);
  return s !== "closed" && s !== "info";
}

export function isOverdue(r: RecordItem): boolean {
  return effectiveStatus(r) === "overdue";
}

export function overdueDays(r: RecordItem): number {
  return daysUntil(r.deadline); // negative when overdue
}

/** records due within the next `n` days (and not yet completed) */
export function dueWithin(r: RecordItem, n: number): boolean {
  const d = daysUntil(r.deadline);
  return isOpen(r) && d >= 0 && d <= n && effectiveStatus(r) !== "overdue";
}

export interface Kpis {
  total: number;
  done: number;
  active: number;
  overdue: number;
  open: number;
  closed: number;
  newCount: number;
  completionRate: number; // نسبة الإنجاز
  commitmentRate: number; // نسبة الالتزام
}

export function computeKpis(records: RecordItem[]): Kpis {
  const total = records.length;
  let done = 0;
  let active = 0;
  let overdue = 0;
  let closed = 0;
  let newCount = 0;
  let onTimeCompleted = 0;
  let completedTotal = 0;

  for (const r of records) {
    const s = effectiveStatus(r);
    if (s === "done") done++;
    if (s === "active") active++;
    if (s === "overdue") overdue++;
    if (s === "closed") closed++;
    if (s === "new") newCount++;

    if (s === "done" || s === "closed") {
      completedTotal++;
      // on-time if executed on or before deadline
      if (r.executedDate && new Date(r.executedDate) <= new Date(r.deadline)) {
        onTimeCompleted++;
      }
    }
  }

  const open = records.filter(isOpen).length;
  const completed = done + closed;
  const completionRate = total ? (completed / total) * 100 : 0;
  const commitmentRate = completedTotal
    ? (onTimeCompleted / completedTotal) * 100
    : 0;

  return {
    total,
    done,
    active,
    overdue,
    open,
    closed,
    newCount,
    completionRate,
    commitmentRate,
  };
}
