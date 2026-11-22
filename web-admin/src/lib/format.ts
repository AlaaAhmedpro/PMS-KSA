import type { Locale } from "../i18n/messages";
import { DICTS } from "../i18n/messages";

let activeLocale: Locale = "ar";

export function setFormatLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getFormatLocale(): Locale {
  return activeLocale;
}

function dateLocaleTag(): string {
  return activeLocale === "en" ? "en-GB" : "ar-SA";
}

function dateOpts(
  base: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  return { ...base, numberingSystem: "latn" };
}

function numFmt(): Intl.NumberFormat {
  return new Intl.NumberFormat("en-US", { numberingSystem: "latn" });
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(
    dateLocaleTag(),
    dateOpts({ year: "numeric", month: "long", day: "numeric" }),
  ).format(d);
}

export function formatShortDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(
    dateLocaleTag(),
    dateOpts({ year: "numeric", month: "2-digit", day: "2-digit" }),
  ).format(d);
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(
    dateLocaleTag(),
    dateOpts({
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  ).format(d);
}

export function formatNotificationDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(
    dateLocaleTag(),
    dateOpts({
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  ).format(d);
}

export function formatNumber(n: number): string {
  return numFmt().format(n);
}

export function formatPercent(n: number): string {
  return `${numFmt().format(Math.round(n))}%`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toInputDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function daysUntil(iso?: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function relativeDeadline(iso?: string): string {
  const n = daysUntil(iso);
  if (activeLocale === "en") {
    if (n === 0) return "Today";
    if (n < 0) return `${numFmt().format(n)} days`;
    return `In ${numFmt().format(n)} days`;
  }
  if (n === 0) return "اليوم";
  if (n < 0) return `${numFmt().format(n)} أيام`;
  return `خلال ${numFmt().format(n)} أيام`;
}

export function fileSize(bytes: number): string {
  if (activeLocale === "en") {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function formatSar(amount: number | null | undefined): string {
  const n =
    typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const suffix =
    activeLocale === "en"
      ? ` ${DICTS.en["common.currencySar"]}`
      : ` ${DICTS.ar["common.currencySar"]}`;
  return `${formatted}${suffix}`;
}