import { daysUntil } from "./format";
import { effectiveStatus, isOpen } from "./status";
import type { RecordItem } from "./types";

export type AlertLevel = "warning" | "danger" | "info";

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  recordId: string;
  kind: RecordItem["kind"];
}

/**
 * Front-end simulation of the automated alerts described in the spec:
 * - pre-deadline reminder (<= 3 days / 24h) for the assignee
 * - daily overdue alert
 * - manager escalation after overdue
 */
export function buildAlerts(records: RecordItem[]): Alert[] {
  const alerts: Alert[] = [];
  for (const r of records) {
    if (!isOpen(r)) continue;
    const d = daysUntil(r.deadline);
    const status = effectiveStatus(r);

    if (status === "overdue") {
      alerts.push({
        id: `overdue-${r.id}`,
        level: "danger",
        title: "سجل متأخر",
        detail: `${r.subject} — متأخرة ${Math.abs(d)} أيام (المسؤول: ${r.assignee})`,
        recordId: r.id,
        kind: r.kind,
      });
      // manager escalation
      alerts.push({
        id: `escalation-${r.id}`,
        level: "danger",
        title: "تصعيد للمدير المباشر",
        detail: `تم إخطار المدير المباشر بتأخر: ${r.subject}`,
        recordId: r.id,
        kind: r.kind,
      });
    } else if (d >= 0 && d <= 1) {
      alerts.push({
        id: `due24-${r.id}`,
        level: "warning",
        title: "تنبيه قبل الموعد بـ 24 ساعة",
        detail: `${r.subject} — يستحق التنفيذ ${d === 0 ? "اليوم" : "غداً"}`,
        recordId: r.id,
        kind: r.kind,
      });
    } else if (d > 1 && d <= 3) {
      alerts.push({
        id: `due3-${r.id}`,
        level: "warning",
        title: "موعد تنفيذ قريب",
        detail: `${r.subject} — باقٍ ${d} أيام`,
        recordId: r.id,
        kind: r.kind,
      });
    }
  }
  // most urgent first
  return alerts.sort((a) => (a.level === "danger" ? -1 : 1));
}

/** المشاريع/المهام الواجب تنفيذها خلال 7 أيام القادمة */
export function dueNext7(records: RecordItem[]): RecordItem[] {
  return records
    .filter((r) => {
      const d = daysUntil(r.deadline);
      return isOpen(r) && d >= 0 && d <= 7 && effectiveStatus(r) !== "overdue";
    })
    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline));
}
