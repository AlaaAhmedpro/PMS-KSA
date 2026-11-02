import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  ClipboardList,
  Plus,
  Search,
  Paperclip,
  Printer,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { useData } from "../store/DataStore";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { effectiveStatus, overdueDays } from "../lib/status";
import { RECORD_KIND_LABELS_PLURAL, STATUS_META } from "../lib/constants";
import { formatNumber, formatShortDate, relativeDeadline } from "../lib/format";
import { canUserViewRecordInList } from "../lib/actionHelpers";
import { cn } from "../lib/cn";
import { usePagination, PAGE_SIZE_RECORDS } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";
import type { RecordKind, Status } from "../lib/types";

export function RecordsList({ kind }: { kind: RecordKind }) {
  const { records, branches, departments, entities } = useData();
  const { user } = useAuth();
  const can = useCan();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  const base = kind === "project" ? "/projects" : "/tasks";
  const title = RECORD_KIND_LABELS_PLURAL[kind];

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "كل الحالات" },
      ...(Object.keys(STATUS_META) as Status[]).map((s) => ({
        value: s,
        label: STATUS_META[s].label,
      })),
    ],
    [],
  );
  const branchOptions = useMemo(
    () => [
      { value: "all", label: "كل مقار المصانع" },
      ...branches.map((b) => ({ value: b.id, label: b.name })),
    ],
    [branches],
  );
  const deptOptions = useMemo(
    () => [
      { value: "all", label: "كل الأدارات / الفروع" },
      ...departments.map((d) => ({ value: d.id, label: d.name })),
    ],
    [departments],
  );

  const filtered = useMemo(() => {
    return records
      .filter((r) => r.kind === kind)
      .filter((r) => canUserViewRecordInList(user, r))
      .filter((r) => {
        const entity = entities.find((e) => e.id === r.entityId)?.name || "";
        const q = search.trim().toLowerCase();
        const matchSearch =
          !q ||
          r.regNumber.toLowerCase().includes(q) ||
          r.outNumber.toLowerCase().includes(q) ||
          entity.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q);
        const matchStatus =
          statusFilter === "all" || effectiveStatus(r) === statusFilter;
        const matchBranch = branchFilter === "all" || r.branchId === branchFilter;
        const matchDept = deptFilter === "all" || r.departmentId === deptFilter;
        return matchSearch && matchStatus && matchBranch && matchDept;
      })
      .sort(
        (a, b) =>
          new Date(b.arrivalDate).getTime() - new Date(a.arrivalDate).getTime(),
      );
  }, [records, kind, search, statusFilter, branchFilter, deptFilter, user, entities]);

  const {
    paginated: pageRows,
    page,
    setPage,
    totalPages,
    total,
    rangeStart,
    rangeEnd,
  } = usePagination(filtered, PAGE_SIZE_RECORDS, [
    kind,
    search,
    statusFilter,
    branchFilter,
    deptFilter,
  ]);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={`${formatNumber(filtered.length)} سجل — تسجيل ومتابعة`}
        icon={
          kind === "project" ? (
            <Mail className="h-6 w-6" />
          ) : (
            <ClipboardList className="h-6 w-6" />
          )
        }
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="no-print w-full justify-center sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            {can.manageRecords(user?.role) && (
              <Button
                onClick={() => navigate(`${base}/new`)}
                className="w-full justify-center sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                {kind === "project" ? "تسجيل مشروع" : "تسجيل مهمة"}
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-4 p-3 sm:p-4 no-print">
        <div className="flex flex-col gap-3">
          <div className="relative w-full min-w-0">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الخطاب أو الجهة أو الموضوع..."
              className="pr-10"
            />
          </div>
          <div className="filter-bar grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <SearchableSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as Status | "all")}
              options={statusOptions}
              className="w-full"
              searchPlaceholder="بحث في الحالات..."
            />
            <SearchableSelect
              value={branchFilter}
              onChange={setBranchFilter}
              options={branchOptions}
              className="w-full"
              searchPlaceholder="بحث في المقار..."
            />
            <SearchableSelect
              value={deptFilter}
              onChange={setDeptFilter}
              options={deptOptions}
              className="w-full sm:col-span-2 lg:col-span-1"
              searchPlaceholder="بحث في الأدارات..."
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="لا توجد سجلات مطابقة"
            subtitle="جرّب تعديل البحث أو الفلاتر"
          />
        ) : (
          <>
            <div className="mobile-data-list divide-y divide-steel-100 dark:divide-steel-800 md:hidden">
              {pageRows.map((r) => {
                const entity = entities.find((e) => e.id === r.entityId);
                const branch = branches.find((b) => b.id === r.branchId);
                const dept = departments.find((d) => d.id === r.departmentId);
                const status = effectiveStatus(r);
                const od = overdueDays(r);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(`${base}/${r.id}`)}
                    className="mobile-record-card w-full p-4 text-right transition-colors hover:bg-brand-500/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                            {r.regNumber}
                          </span>
                          {r.attachments.length > 0 && (
                            <Paperclip className="h-3.5 w-3.5 text-steel-400" />
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-steel-800 dark:text-steel-100">
                          {r.subject}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-steel-500 dark:text-steel-400">
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-steel-400">الجهة</span>
                        <span className="line-clamp-1">{entity?.name}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-steel-400">الفرع / المنطقة</span>
                        <span className="line-clamp-1">{branch?.name}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-steel-400">المسؤول</span>
                        <span className="line-clamp-1">{r.assignee}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-steel-400">الموعد</span>
                        <span className="text-steel-600 dark:text-steel-300">
                          {formatShortDate(r.deadline)}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block",
                            status === "overdue"
                              ? "font-bold text-red-500"
                              : "text-steel-400",
                          )}
                        >
                          {status === "overdue"
                            ? `${formatNumber(od)} أيام`
                            : relativeDeadline(r.deadline)}
                        </span>
                      </div>
                    </div>
                    {dept?.name && (
                      <p className="mt-2 truncate text-[11px] text-steel-400">{dept.name}</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="data-table-wrap hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-steel-100 bg-steel-50 text-xs text-steel-500 dark:border-steel-800 dark:bg-steel-800/40">
                  <th className="px-4 py-3 font-bold">رقم القيد</th>
                  <th className="px-4 py-3 font-bold">الجهة المرسلة</th>
                  <th className="px-4 py-3 font-bold">الموضوع</th>
                  <th className="px-4 py-3 font-bold">الفرع / المنطقة</th>
                  <th className="px-4 py-3 font-bold">الأدارات / الفروع</th>
                  <th className="px-4 py-3 font-bold">المسؤول</th>
                  <th className="px-4 py-3 font-bold">الموعد</th>
                  <th className="px-4 py-3 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const entity = entities.find((e) => e.id === r.entityId);
                  const branch = branches.find((b) => b.id === r.branchId);
                  const dept = departments.find((d) => d.id === r.departmentId);
                  const status = effectiveStatus(r);
                  const od = overdueDays(r);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`${base}/${r.id}`)}
                      className="cursor-pointer border-b border-steel-50 transition-colors hover:bg-brand-500/5 dark:border-steel-800/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                          {r.regNumber}
                        </span>
                        {r.attachments.length > 0 && (
                          <Paperclip className="mr-1 inline h-3.5 w-3.5 text-steel-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-steel-600 dark:text-steel-300">{entity?.name}</td>
                      <td className="max-w-[260px] truncate px-4 py-3 font-medium text-steel-700 dark:text-steel-200">{r.subject}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-steel-600 dark:text-steel-300">{branch?.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-steel-600 dark:text-steel-300">{dept?.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-steel-600 dark:text-steel-300">{r.assignee}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="text-steel-600 dark:text-steel-300">{formatShortDate(r.deadline)}</span>
                        <span
                          className={cn(
                            "mt-0.5 block text-xs",
                            status === "overdue"
                              ? "font-bold text-red-500"
                              : "text-steel-400",
                          )}
                        >
                          {status === "overdue"
                            ? `${formatNumber(od)} أيام`
                            : relativeDeadline(r.deadline)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
        {filtered.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        )}
      </Card>
    </div>
  );
}
