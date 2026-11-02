import { SEED_BRANCHES, SEED_CATEGORIES, SEED_DEPARTMENTS } from "./constants";
import type { Branch, CategoryItem, Department, Entity } from "./types";
import { effectiveStatus, isOverdue } from "./status";
import type { RecordItem } from "./types";

export type PerfChartRow = { name: string; منجز: number; متأخر: number };

export function perfByBranch(
  records: RecordItem[],
  branches: Branch[] = SEED_BRANCHES,
): PerfChartRow[] {
  return branches.map((b) => {
    const inBranch = records.filter((r) => r.branchId === b.id);
    const done = inBranch.filter(
      (r) => effectiveStatus(r) === "done" || effectiveStatus(r) === "closed",
    ).length;
    const overdue = inBranch.filter(isOverdue).length;
    return { name: b.name, "منجز": done, "متأخر": overdue };
  });
}

/** المنجز مقابل المتأخر لكل إدارة داخل مقر مصنع محدد */
export function perfByDepartmentInBranch(
  records: RecordItem[],
  branchId: string,
  departments: Department[] = SEED_DEPARTMENTS,
): PerfChartRow[] {
  const inBranch = records.filter((r) => r.branchId === branchId);
  return departments.map((d) => {
    const inDept = inBranch.filter((r) => r.departmentId === d.id);
    const done = inDept.filter(
      (r) =>
        effectiveStatus(r) === "done" || effectiveStatus(r) === "closed",
    ).length;
    const overdue = inDept.filter(isOverdue).length;
    return { name: d.name, "منجز": done, "متأخر": overdue };
  });
}

export function byCategory(
  records: RecordItem[],
  categories: CategoryItem[] = SEED_CATEGORIES,
) {
  return categories
    .map((c) => ({
      name: c.name,
      value: records.filter((r) => r.category === c.id).length,
    }))
    .filter((x) => x.value > 0);
}

export function byDepartment(
  records: RecordItem[],
  departments: Department[] = SEED_DEPARTMENTS,
) {
  return departments.map((d) => ({
    name: d.name,
    value: records.filter((r) => r.departmentId === d.id).length,
  })).sort((a, b) => b.value - a.value);
}

const WEEK_LABELS = [
  "الأسبوع الأول",
  "الأسبوع الثاني",
  "الأسبوع الثالث",
  "الأسبوع الرابع",
  "الأسبوع الخامس",
];

/** flow of incoming letters split into the weeks of a specific month */
export function flowByWeekOfMonth(
  records: RecordItem[],
  year: number,
  month: number,
) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // split the month into ~4 weeks (1-7, 8-14, 15-21, 22-end)
  const ranges: { start: number; end: number }[] = [
    { start: 1, end: 7 },
    { start: 8, end: 14 },
    { start: 15, end: 21 },
    { start: 22, end: daysInMonth },
  ];
  return ranges.map((rng, i) => {
    const count = records.filter((r) => {
      const a = new Date(r.arrivalDate);
      return (
        a.getFullYear() === year &&
        a.getMonth() === month &&
        a.getDate() >= rng.start &&
        a.getDate() <= rng.end
      );
    }).length;
    return { name: WEEK_LABELS[i], value: count };
  });
}

export type MonthOption = {
  value: string;
  label: string;
  year: number;
  month: number;
};

const monthLabelFmt = new Intl.DateTimeFormat("ar-EG", {
  month: "long",
  year: "numeric",
});

function toMonthOption(d: Date): MonthOption {
  return {
    value: `${d.getFullYear()}-${d.getMonth()}`,
    label: monthLabelFmt.format(d),
    year: d.getFullYear(),
    month: d.getMonth(),
  };
}

/** list of the last `n` months as {value: "YYYY-M", label} for a selector */
export function recentMonths(n = 6): MonthOption[] {
  const months: MonthOption[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(toMonthOption(d));
  }
  return months;
}

/** كل الأشهر من أقدم وارد مسجّل حتى الشهر الحالي */
export function allMonthsFromRecords(records: RecordItem[]): MonthOption[] {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  let start = new Date(end);

  if (records.length > 0) {
    const earliest = records.reduce((min, r) => {
      const t = new Date(r.arrivalDate).getTime();
      return t < min ? t : min;
    }, new Date(records[0].arrivalDate).getTime());
    const e = new Date(earliest);
    start = new Date(e.getFullYear(), e.getMonth(), 1);
  }

  const months: MonthOption[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    months.push(toMonthOption(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

export function topEntities(
  records: RecordItem[],
  entities: Entity[],
  limit = 5,
) {
  const counts = new Map<string, number>();
  for (const r of records) {
    counts.set(r.entityId, (counts.get(r.entityId) || 0) + 1);
  }
  return entities
    .map((e) => ({ name: e.name, value: counts.get(e.id) || 0 }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function mostDelayedDepartments(
  records: RecordItem[],
  limit = 5,
  departments: Department[] = SEED_DEPARTMENTS,
) {
  return departments.map((d) => ({
    name: d.name,
    value: records.filter((r) => r.departmentId === d.id && isOverdue(r)).length,
  }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
