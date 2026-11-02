import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive as ArchiveIcon, Search, Printer, Paperclip } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { useData } from "../store/DataStore";
import {
  recordHasAttachmentMatch,
  recordMatchesArchiveSearch,
} from "../lib/attachmentSearch";
import { effectiveStatus } from "../lib/status";
import { formatShortDate } from "../lib/format";
import { useArchiveAttachmentIndexing } from "../hooks/useArchiveAttachmentIndexing";
import { usePagination, PAGE_SIZE_RECORDS } from "../hooks/usePagination";
import { Pagination } from "../components/ui/Pagination";

export function Archive() {
  const { records, branches, departments, entities, updateRecord } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | "project" | "task">("all");

  useArchiveAttachmentIndexing(records, updateRecord);

  const archived = useMemo(
    () =>
      records
        .filter((r) => effectiveStatus(r) === "closed")
        .filter((r) => kind === "all" || r.kind === kind)
        .filter((r) => {
          const entity = entities.find((e) => e.id === r.entityId)?.name || "";
          return recordMatchesArchiveSearch(r, search, entity);
        })
        .sort(
          (a, b) =>
            new Date(b.executedDate || b.arrivalDate).getTime() -
            new Date(a.executedDate || a.arrivalDate).getTime(),
        ),
    [records, search, kind, entities],
  );

  const {
    paginated: pageRows,
    page,
    setPage,
    totalPages,
    total,
    rangeStart,
    rangeEnd,
  } = usePagination(archived, PAGE_SIZE_RECORDS, [search, kind]);

  return (
    <div>
      <PageHeader
        title="الأرشيف الإلكتروني"
        subtitle="المشاريع والمهام المغلقة والمؤرشفة"
        icon={<ArchiveIcon className="h-6 w-6" />}
        actions={
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="no-print w-full justify-center sm:w-auto"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
        }
      />

      <Card className="mb-4 p-3 sm:p-4 no-print">
        <div className="flex flex-col gap-3">
          <div className="relative w-full min-w-0">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم القيد أو الموضوع أو الجهة أو نص داخل المرفقات (PDF/صورة)..."
              className="pr-10"
            />
          </div>
          <p className="text-xs leading-relaxed text-steel-500 dark:text-steel-400">
            يدعم البحث بالعربية والإنجليزية داخل ملفات PDF والصور المرفوعة.
          </p>
          <SearchableSelect
            value={kind}
            onChange={(v) => setKind(v as typeof kind)}
            className="w-full sm:w-48"
            options={[
              { value: "all", label: "الكل" },
              { value: "project", label: "مشاريع" },
              { value: "task", label: "مهام" },
            ]}
            searchPlaceholder="بحث..."
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {archived.length === 0 ? (
          <EmptyState title="لا توجد سجلات مؤرشفة" subtitle="ستظهر هنا المشاريع والمهام المغلقة" />
        ) : (
          <>
            <div className="mobile-data-list divide-y divide-steel-100 dark:divide-steel-800 md:hidden">
              {pageRows.map((r) => {
                const entity = entities.find((e) => e.id === r.entityId);
                const branch = branches.find((b) => b.id === r.branchId);
                const dept = departments.find((d) => d.id === r.departmentId);
                const attachmentHit =
                  search.trim() && recordHasAttachmentMatch(r, search);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        r.kind === "task"
                          ? `/tasks/${r.id}`
                          : `/projects/${r.id}`,
                      )
                    }
                    className="mobile-record-card w-full p-4 text-right transition-colors hover:bg-brand-500/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                            {r.regNumber}
                          </span>
                          <span className="rounded-full bg-steel-500/10 px-2 py-0.5 text-[10px] font-bold text-steel-500 dark:text-steel-400">
                            {r.kind === "task" ? "مهمة" : "مشروع"}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-steel-800 dark:text-steel-100">
                          {r.subject}
                        </p>
                        {attachmentHit && (
                          <span className="mt-2 inline-flex rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">
                            تطابق في مرفق
                          </span>
                        )}
                      </div>
                      {r.attachments.length > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-steel-500/10 px-2.5 py-1 text-[11px] font-bold text-steel-500 dark:text-steel-400">
                          <Paperclip className="h-3.5 w-3.5" />
                          {r.attachments.length}
                        </span>
                      )}
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
                        <span className="block text-[10px] font-bold text-steel-400">تاريخ الإغلاق</span>
                        <span>{formatShortDate(r.executedDate || r.arrivalDate)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-steel-400">الأدارة / الفرع</span>
                        <span className="line-clamp-1">{dept?.name}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="data-table-wrap hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-y border-steel-100 bg-steel-50 text-xs text-steel-500 dark:border-steel-800 dark:bg-steel-800/40">
                  <th className="px-4 py-3 font-bold">رقم القيد</th>
                  <th className="px-4 py-3 font-bold">النوع</th>
                  <th className="px-4 py-3 font-bold">الجهة المرسلة</th>
                  <th className="px-4 py-3 font-bold">الموضوع</th>
                  <th className="px-4 py-3 font-bold">الفرع / المنطقة</th>
                  <th className="px-4 py-3 font-bold">الأدارات / الفروع</th>
                  <th className="px-4 py-3 font-bold">تاريخ الإغلاق</th>
                  <th className="px-4 py-3 font-bold">المرفقات</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const entity = entities.find((e) => e.id === r.entityId);
                  const attachmentHit =
                    search.trim() && recordHasAttachmentMatch(r, search);
                  return (
                    <tr
                      key={r.id}
                      onClick={() =>
                        navigate(
                          r.kind === "task"
                            ? `/tasks/${r.id}`
                            : `/projects/${r.id}`,
                        )
                      }
                      className="cursor-pointer border-b border-steel-50 transition-colors hover:bg-brand-500/5 dark:border-steel-800/60"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                        {r.regNumber}
                      </td>
                      <td className="px-4 py-3 text-steel-500">
                        {r.kind === "task" ? "مهمة" : "مشروع"}
                      </td>
                      <td className="px-4 py-3 text-steel-600 dark:text-steel-300">{entity?.name}</td>
                      <td className="max-w-[260px] px-4 py-3 text-steel-700 dark:text-steel-200">
                        <p className="truncate font-medium">{r.subject}</p>
                        {attachmentHit && (
                          <span className="mt-1 inline-flex rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">
                            تطابق في مرفق
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-steel-600 dark:text-steel-300">
                        {branches.find((b) => b.id === r.branchId)?.name}
                      </td>
                      <td className="px-4 py-3 text-steel-600 dark:text-steel-300">
                        {departments.find((d) => d.id === r.departmentId)?.name}
                      </td>
                      <td className="px-4 py-3 text-steel-600 dark:text-steel-300">
                        {formatShortDate(r.executedDate || r.arrivalDate)}
                      </td>
                      <td className="px-4 py-3 text-steel-500">
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5" />
                          {r.attachments.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
        {archived.length > 0 && (
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
