const dateFmt = new Intl.DateTimeFormat("ar-EG", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shortDateFmt = new Intl.DateTimeFormat("ar-EG", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFmt = new Intl.DateTimeFormat("ar-EG", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const notificationDateTimeFmt = new Intl.DateTimeFormat("ar-EG", {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

export function formatShortDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return shortDateFmt.format(d);
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return dateTimeFmt.format(d);
}

/** تاريخ ووقت كامل للإشعارات */
export function formatNotificationDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return notificationDateTimeFmt.format(d);
}

const numFmt = new Intl.NumberFormat("ar-EG");
export function formatNumber(n: number): string {
  return numFmt.format(n);
}

export function formatPercent(n: number): string {
  return `${numFmt.format(Math.round(n))}%`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toInputDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

/** number of full days between today and a deadline (positive = remaining, negative = overdue) */
export function daysUntil(iso?: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** "-5 أيام" / "خلال 3 أيام" / "اليوم" */
export function relativeDeadline(iso?: string): string {
  const n = daysUntil(iso);
  if (n === 0) return "اليوم";
  if (n < 0) return `${numFmt.format(n)} أيام`;
  return `خلال ${numFmt.format(n)} أيام`;
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}
