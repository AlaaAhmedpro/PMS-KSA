import { STATUS_META } from "./constants";
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

export const REPORT_DEFS: { id: ReportId; label: string; description: string }[] =
  [
    {
      id: "overdue",
      label: "تقرير المشاريع والمهام المتأخرة",
      description: "كل القيود المتأخرة عن موعدها مرتبة بالأكثر تأخيراً",
    },
    {
      id: "branch-performance",
      label: "تقرير أداء الفروع",
      description: "الإنجاز والتأخير ونسبة الإنجاز لكل فرع",
    },
    {
      id: "by-entity",
      label: "تقرير السجلات حسب الجهة",
      description: "عدد المشاريع والمهام المرتبطة بكل جهة",
    },
    {
      id: "monthly",
      label: "تقرير الإنجاز الشهري",
      description: "المسجّل والمنجز ونسبة الإنجاز لكل الشهور",
    },
    {
      id: "open-tasks",
      label: "تقرير المهام المفتوحة",
      description: "المهام التي لم تُغلق بعد",
    },
    {
      id: "commitment",
      label: "تقرير الالتزام بالمواعيد",
      description: "نسبة المنجز في الموعد المحدد لكل فرع",
    },
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
const kindLabel = (r: RecordItem) =>
  r.kind === "task" ? "مهمة" : "مشروع";

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

function buildOverdue(records: RecordItem[], lk: ReportLookups): ReportTable {
  const rows = records
    .filter(isOverdue)
    .sort((a, b) => overdueDays(a) - overdueDays(b));
  const branchesHit = new Set(rows.map((r) => r.branchId)).size;
  const worst = rows.length ? Math.abs(overdueDays(rows[0])) : 0;
  return {
    id: "overdue",
    title: "تقرير السجلات المتأخرة",
    subtitle: "القيود المتأخرة عن موعدها المحدد",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "إجمالي المتأخرة", value: formatNumber(rows.length), tone: "red" },
      { label: "أقصى تأخير (أيام)", value: formatNumber(worst), tone: "red" },
      { label: "مقار متأثرة", value: formatNumber(branchesHit), tone: "amber" },
    ],
    columns: [
      "رقم القيد",
      "النوع",
      "الجهة",
      "الموضوع",
      "الفرع / المنطقة",
      "الأدارات / الفروع",
      "المسؤول",
      "الموعد",
      "أيام التأخير",
    ],
    numericColumns: [8],
    rows: rows.map((r) => [
      r.regNumber,
      kindLabel(r),
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

function buildBranchPerformance(records: RecordItem[], lk: ReportLookups): ReportTable {
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
    title: "تقرير أداء الفروع والمناطق",
    subtitle: "مقارنة الإنجاز والتأخير بين مقار المصانع",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "عدد المقار", value: formatNumber(data.length) },
      {
        label: "أعلى مقر إنجازاً",
        value: best ? `${best.name} (${formatPercent(best.rate)})` : "—",
        tone: "brand",
      },
    ],
    columns: [
      "الفرع / المنطقة",
      "الإجمالي",
      "منجز",
      "متأخر",
      "مفتوح",
      "نسبة الإنجاز",
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

function buildByEntity(records: RecordItem[], lk: ReportLookups): ReportTable {
  const counts = new Map<string, number>();
  for (const r of records)
    counts.set(r.entityId, (counts.get(r.entityId) || 0) + 1);
  const ents = lk.entities ?? [];
  const data = ents.map((e) => ({
    name: e.name,
    value: counts.get(e.id) || 0,
  }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  return {
    id: "by-entity",
    title: "تقرير السجلات حسب الجهة",
    subtitle: "توزيع المشاريع والمهام على الجهات",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "عدد الجهات", value: formatNumber(data.length) },
      {
        label: "أكثر جهة ارتباطاً",
        value: data[0] ? `${data[0].name} (${formatNumber(data[0].value)})` : "—",
        tone: "brand",
      },
    ],
    columns: ["#", "الجهة", "عدد السجلات"],
    numericColumns: [0, 2],
    rows: data.map((d, i) => [i + 1, d.name, formatNumber(d.value)]),
  };
}

function buildMonthly(records: RecordItem[]): ReportTable {
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
    title: "تقرير الإنجاز الشهري",
    subtitle: `المسجّل والمنجز لكل الشهور (${formatNumber(months.length)} شهر)`,
    generatedAt: new Date().toISOString(),
    summary: [
      {
        label: "إجمالي السجلات",
        value: formatNumber(data.reduce((s, d) => s + d.arrived, 0)),
      },
      {
        label: "إجمالي المنجز",
        value: formatNumber(data.reduce((s, d) => s + d.done, 0)),
        tone: "brand",
      },
    ],
    columns: ["الشهر", "المسجّل", "المنجز", "نسبة الإنجاز"],
    numericColumns: [1, 2, 3],
    rows: data.map((d) => [
      d.label,
      formatNumber(d.arrived),
      formatNumber(d.done),
      formatPercent(d.rate),
    ]),
  };
}

function buildOpenAssignments(records: RecordItem[], lk: ReportLookups): ReportTable {
  const rows = records
    .filter((r) => r.kind === "task" && isOpen(r))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const overdueCount = rows.filter(isOverdue).length;
  return {
    id: "open-tasks",
    title: "تقرير المهام المفتوحة",
    subtitle: "المهام التي لم تُغلق بعد",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "إجمالي المفتوحة", value: formatNumber(rows.length), tone: "amber" },
      { label: "متأخر منها", value: formatNumber(overdueCount), tone: "red" },
    ],
    columns: [
      "رقم القيد",
      "الجهة",
      "الموضوع",
      "الفرع / المنطقة",
      "الأدارات / الفروع",
      "المسؤول",
      "الموعد",
      "الحالة",
    ],
    rows: rows.map((r) => [
      r.regNumber,
      entityName(r.entityId, lk.entities ?? []),
      r.subject,
      branchName(r.branchId, lk.branches),
      deptName(r.departmentId, lk.departments),
      r.assignee || "—",
      formatShortDate(r.deadline),
      STATUS_META[effectiveStatus(r)].label,
    ]),
  };
}

function buildCommitment(records: RecordItem[], lk: ReportLookups): ReportTable {
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
    title: "تقرير الالتزام بالمواعيد",
    subtitle: "نسبة المنجز في الموعد لكل فرع / منطقة",
    generatedAt: new Date().toISOString(),
    summary: [
      {
        label: "نسبة الالتزام العامة",
        value: formatPercent(overall),
        tone: "sky",
      },
      { label: "منجز في الموعد", value: formatNumber(totalOnTime), tone: "brand" },
    ],
    columns: ["الفرع / المنطقة", "إجمالي المنجز", "في الموعد", "نسبة الالتزام"],
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
  lookups?: Partial<ReportLookups>,
): ReportTable {
  const lk: ReportLookups = { ...defaultLookups(), ...lookups };
  switch (id) {
    case "overdue":
      return buildOverdue(records, lk);
    case "branch-performance":
      return buildBranchPerformance(records, lk);
    case "by-entity":
      return buildByEntity(records, lk);
    case "monthly":
      return buildMonthly(records);
    case "open-tasks":
      return buildOpenAssignments(records, lk);
    case "commitment":
      return buildCommitment(records, lk);
  }
}

/** Build a CSV string (with UTF-8 BOM) and trigger a download. */
export function exportReportToCsv(report: ReportTable) {
  const escape = (cell: string | number) =>
    `"${String(cell).replace(/"/g, '""')}"`;
  const lines: string[] = [];
  lines.push(escape(report.title));
  lines.push(escape(`تاريخ الإصدار: ${formatShortDate(report.generatedAt)}`));
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
