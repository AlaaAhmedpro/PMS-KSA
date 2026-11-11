import type { Branch, Department, Entity } from "./types";
import { effectiveStatus, isOpen, isOverdue, overdueDays } from "./status";
import { allMonthsFromRecords } from "./analytics";
import { formatNumber, formatPercent, formatShortDate } from "./format";
import type { RecordItem } from "./types";

export type ReportId =
  | "overdue"
  | "branch-performance"
  | "by-entity"
  | "monthly"
  | "open-tasks"
  | "commitment";

export type ReportTranslate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export interface ReportSummaryItem {
  label: string;
  value: string;
  tone?: "steel" | "brand" | "amber" | "red" | "sky";
}

export interface ReportTable {
  id: ReportId;
  title: string;
  subtitle: string;
  generatedAt: string;
  summary: ReportSummaryItem[];
  columns: string[];
  /** numeric column indexes rendered as ltr/centered numbers */
  numericColumns?: number[];
  rows: (string | number)[][];
}

export const REPORT_DEFS: { id: ReportId }[] = [
  { id: "overdue" },
  { id: "branch-performance" },
  { id: "by-entity" },
  { id: "monthly" },
  { id: "open-tasks" },
  { id: "commitment" },
];

export interface ReportLookups {
  branches: Branch[];
  departments: Department[];
  entities?: Entity[];
}

const defaultLookups = (): ReportLookups => ({
  branches: [],
  departments: [],
  entities: [],
});

const entityName = (id: string, entities: Entity[]) =>
  entities.find((e) => e.id === id)?.name ?? "—";

const branchName = (id: string, branches: Branch[]) =>
  branches.find((b) => b.id === id)?.name ?? "—";
const deptName = (id: string, departments: Department[]) =>
  departments.find((d) => d.id === id)?.name ?? "—";
const kindLabel = (r: RecordItem, t: ReportTranslate) =>
  r.kind === "task" ? t("record.kind.task") : t("record.kind.project");

function isCompleted(r: RecordItem): boolean {
  const s = effectiveStatus(r);
  return s === "done" || s === "closed";
}

function isOnTime(r: RecordItem): boolean {
  return (
    isCompleted(r) &&
    !!r.executedDate &&
    new Date(r.executedDate) <= new Date(r.deadline)
  );
}

function buildOverdue(
  records: RecordItem[],
  lk: ReportLookups,
  t: ReportTranslate,
): ReportTable {
  const rows = records
    .filter(isOverdue)
    .sort((a, b) => overdueDays(a) - overdueDays(b));
  const branchesHit = new Set(rows.map((r) => r.branchId)).size;
  const worst = rows.length ? Math.abs(overdueDays(rows[0])) : 0;
  return {
    id: "overdue",
    title: t("reports.build.overdue.title"),
    subtitle: t("reports.build.overdue.subtitle"),
    generatedAt: new Date().toISOString(),
    summary: [
      {
        label: t("reports.summary.overdue.total"),
        value: formatNumber(rows.length),
        tone: "red",
      },
      {
        label: t("reports.summary.overdue.maxDays"),
        value: formatNumber(worst),
        tone: "red",
      },
      {
        label: t("reports.summary.overdue.branches"),
        value: formatNumber(branchesHit),
        tone: "amber",
      },
    ],
    columns: [
      t("reports.columns.regNumber"),
      t("reports.columns.kind"),
      t("reports.columns.entity"),
      t("reports.columns.subject"),
      t("reports.columns.branch"),
      t("reports.columns.department"),
      t("reports.columns.assignee"),
      t("reports.columns.deadline"),
      t("reports.columns.overdueDays"),
    ],
    numericColumns: [8],
    rows: rows.map((r) => [
      r.regNumber,
      kindLabel(r, t),
      entityName(r.entityId, lk.entities ?? []),
      r.subject,
      branchName(r.branchId, lk.branches),
      deptName(r.departmentId, lk.departments),
      r.assignee || "—",
      formatShortDate(r.deadline),
      Math.abs(overdueDays(r)),
    ]),
  };
}

function buildBranchPerformance(
  records: RecordItem[],
  lk: ReportLookups,
  t: ReportTranslate,
): ReportTable {
  const data = lk.branches.map((b) => {
    const inBranch = records.filter((r) => r.branchId === b.id);
    const done = inBranch.filter(isCompleted).length;
    const overdue = inBranch.filter(isOverdue).length;
    const open = inBranch.filter(isOpen).length;
    const rate = inBranch.length ? (done / inBranch.length) * 100 : 0;
    return {
      name: b.name,
      total: inBranch.length,
      done,
      overdue,
      open,
      rate,
    };
  });
  const best = [...data].sort((a, b) => b.rate - a.rate)[0];
  return {
    id: "branch-performance",
    title: t("reports.build.branch-performance.title"),
    subtitle: t("reports.build.branch-performance.subtitle"),
    generatedAt: new Date().toISOString(),
    summary: [
      {
        label: t("reports.summary.branchPerformance.branchCount"),
        value: formatNumber(data.length),
      },
      {
        label: t("reports.summary.branchPerformance.topBranch"),
        value: best ? `${best.name} (${formatPercent(best.rate)})` : "—",
        tone: "brand",
      },
    ],
    columns: [
      t("reports.columns.branch"),
      t("reports.columns.total"),
      t("reports.columns.done"),
      t("reports.columns.overdue"),
      t("reports.columns.open"),
      t("reports.columns.completionRate"),
    ],
    numericColumns: [1, 2, 3, 4, 5],
    rows: data.map((d) => [
      d.name,
      formatNumber(d.total),
      formatNumber(d.done),
      formatNumber(d.overdue),
      formatNumber(d.open),
      formatPercent(d.rate),
    ]),
  };
}

function buildByEntity(
  records: RecordItem[],
  lk: ReportLookups,
  t: ReportTranslate,
): ReportTable {
  const counts = new Map<string, number>();
  for (const r of records)
    counts.set(r.entityId, (counts.get(r.entityId) || 0) + 1);
  const ents = lk.entities ?? [];
  const data = ents
    .map((e) => ({
      name: e.name,
      value: counts.get(e.id) || 0,
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  return {
    id: "by-entity",
    title: t("reports.build.by-entity.title"),
    subtitle: t("reports.build.by-entity.subtitle"),
    generatedAt: new Date().toISOString(),
    summary: [
      {
        label: t("reports.summary.byEntity.entityCount"),
        value: formatNumber(data.length),
      },
      {
        label: t("reports.summary.byEntity.topEntity"),
        value: data[0] ? `${data[0].name} (${formatNumber(data[0].value)})` : "—",
        tone: "brand",
      },
    ],
    columns: [
      t("reports.columns.index"),
      t("reports.columns.entity"),
      t("reports.columns.recordCount"),
    ],
    numericColumns: [0, 2],
    rows: data.map((d, i) => [i + 1, d.name, formatNumber(d.value)]),
  };
}

function buildMonthly(records: RecordItem[], t: ReportTranslate): ReportTable {
  const months = allMonthsFromRecords(records);
  const data = months.map((m) => {
    const arrived = records.filter((r) => {
      const a = new Date(r.arrivalDate);
      return a.getFullYear() === m.year && a.getMonth() === m.month;
    });
    const done = arrived.filter(isCompleted).length;
    const rate = arrived.length ? (done / arrived.length) * 100 : 0;
    return { label: m.label, arrived: arrived.length, done, rate };
  });
  return {
    id: "monthly",
    title: t("reports.build.monthly.title"),
    subtitle: t("reports.build.monthly.subtitle", {
      n: formatNumber(months.length),
    }),
    generatedAt: new Date().toISOString(),
    summary: [
      {
        label: t("reports.summary.monthly.totalRecords"),
        value: formatNumber(data.reduce((s, d) => s + d.arrived, 0)),
      },
      {
        label: t("reports.summary.monthly.totalDone"),
        value: formatNumber(data.reduce((s, d) => s + d.done, 0)),
        tone: "brand",
      },
    ],
    columns: [
      t("reports.columns.month"),
      t("reports.columns.registered"),
      t("reports.columns.done"),
      t("reports.columns.completionRate"),
    ],
    numericColumns: [1, 2, 3],
    rows: data.map((d) => [
      d.label,
      formatNumber(d.arrived),
      formatNumber(d.done),
      formatPercent(d.rate),
    ]),
  };
}

function buildOpenAssignments(
  records: RecordItem[],
  lk: ReportLookups,
  t: ReportTranslate,
): ReportTable {
  const rows = records
    .filter((r) => r.kind === "task" && isOpen(r))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const overdueCount = rows.filter(isOverdue).length;
  return {
    id: "open-tasks",
    title: t("reports.build.open-tasks.title"),
    subtitle: t("reports.build.open-tasks.subtitle"),
    generatedAt: new Date().toISOString(),
    summary: [
      {
        label: t("reports.summary.openTasks.totalOpen"),
        value: formatNumber(rows.length),
        tone: "amber",
      },
      {
        label: t("reports.summary.openTasks.overdueAmong"),
        value: formatNumber(overdueCount),
        tone: "red",
      },
    ],
    columns: [
      t("reports.columns.regNumber"),
      t("reports.columns.entity"),
      t("reports.columns.subject"),
      t("reports.columns.branch"),
      t("reports.columns.department"),
      t("reports.columns.assignee"),
      t("reports.columns.deadline"),
      t("reports.columns.status"),
    ],
    rows: rows.map((r) => {
      const status = effectiveStatus(r);
      return [
        r.regNumber,
        entityName(r.entityId, lk.entities ?? []),
        r.subject,
        branchName(r.branchId, lk.branches),
        deptName(r.departmentId, lk.departments),
        r.assignee || "—",
        formatShortDate(r.deadline),
        t(`status.record.${status}`),
      ];
    }),
  };
}

function buildCommitment(
  records: RecordItem[],
  lk: ReportLookups,
  t: ReportTranslate,
): ReportTable {
  const data = lk.branches.map((b) => {
    const inBranch = records.filter((r) => r.branchId === b.id);
    const completed = inBranch.filter(isCompleted).length;
    const onTime = inBranch.filter(isOnTime).length;
    const rate = completed ? (onTime / completed) * 100 : 0;
    return { name: b.name, completed, onTime, rate };
  });
  const totalCompleted = data.reduce((s, d) => s + d.completed, 0);
  const totalOnTime = data.reduce((s, d) => s + d.onTime, 0);
  const overall = totalCompleted ? (totalOnTime / totalCompleted) * 100 : 0;
  return {
    id: "commitment",
    title: t("reports.build.commitment.title"),
    subtitle: t("reports.build.commitment.subtitle"),
    generatedAt: new Date().toISOString(),
    summary: [
      {
        label: t("reports.summary.commitment.overallRate"),
        value: formatPercent(overall),
        tone: "sky",
      },
      {
        label: t("reports.summary.commitment.onTimeCount"),
        value: formatNumber(totalOnTime),
        tone: "brand",
      },
    ],
    columns: [
      t("reports.columns.branch"),
      t("reports.columns.completedTotal"),
      t("reports.columns.onTime"),
      t("reports.columns.commitmentRate"),
    ],
    numericColumns: [1, 2, 3],
    rows: data.map((d) => [
      d.name,
      formatNumber(d.completed),
      formatNumber(d.onTime),
      formatPercent(d.rate),
    ]),
  };
}

export function buildReport(
  id: ReportId,
  records: RecordItem[],
  lookups: Partial<ReportLookups> | undefined,
  t: ReportTranslate,
): ReportTable {
  const lk: ReportLookups = { ...defaultLookups(), ...lookups };
  switch (id) {
    case "overdue":
      return buildOverdue(records, lk, t);
    case "branch-performance":
      return buildBranchPerformance(records, lk, t);
    case "by-entity":
      return buildByEntity(records, lk, t);
    case "monthly":
      return buildMonthly(records, t);
    case "open-tasks":
      return buildOpenAssignments(records, lk, t);
    case "commitment":
      return buildCommitment(records, lk, t);
  }
}

/** Build a CSV string (with UTF-8 BOM) and trigger a download. */
export function exportReportToCsv(
  report: ReportTable,
  t: ReportTranslate,
) {
  const escape = (cell: string | number) =>
    `"${String(cell).replace(/"/g, '""')}"`;
  const lines: string[] = [];
  lines.push(escape(report.title));
  lines.push(
    escape(
      t("reports.csv.issueDate", {
        date: formatShortDate(report.generatedAt),
      }),
    ),
  );
  lines.push("");
  lines.push(report.summary.map((s) => escape(`${s.label}: ${s.value}`)).join(","));
  lines.push("");
  lines.push(report.columns.map(escape).join(","));
  for (const row of report.rows) {
    lines.push(row.map(escape).join(","));
  }
  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${report.title}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
