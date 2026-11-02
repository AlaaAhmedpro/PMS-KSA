import { useEffect, useMemo } from "react";
import { usePagination, PAGE_SIZE_DEFAULT } from "../../hooks/usePagination";
import { Pagination } from "../ui/Pagination";
import { AnimatePresence, motion } from "framer-motion";
import { X, Printer, FileSpreadsheet, FileBarChart } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";
import { formatDate } from "../../lib/format";
import { exportReportToCsv, type ReportTable } from "../../lib/reports";

const toneText: Record<string, string> = {
  steel: "text-steel-700 dark:text-steel-100",
  brand: "text-brand-600 dark:text-brand-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
  sky: "text-sky-600 dark:text-sky-400",
};

export function ReportModal({
  report,
  open,
  onClose,
}: {
  report: ReportTable | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handlePrint = () => {
    document.body.classList.add("report-print-mode");
    const cleanup = () => {
      document.body.classList.remove("report-print-mode");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  const isNumeric = (col: number) =>
    report?.numericColumns?.includes(col) ?? false;

  const rows = useMemo(() => report?.rows ?? [], [report]);
  const pagination = usePagination(rows, PAGE_SIZE_DEFAULT, [report?.id, rows.length]);
  const {
    paginated: pageRows,
    page,
    setPage,
    totalPages,
    total,
    rangeStart,
    rangeEnd,
  } = pagination;

  return (
    <AnimatePresence>
      {open && report && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="no-print absolute inset-0 bg-steel-950/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            className="surface relative z-10 w-full max-w-5xl rounded-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            {/* Header (hidden in print) */}
            <div className="no-print flex items-center justify-between gap-3 border-b border-steel-100 p-5 dark:border-steel-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <FileBarChart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-steel-800 dark:text-steel-100">
                    {report.title}
                  </h3>
                  <p className="text-xs text-steel-400">{report.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportReportToCsv(report)}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  تصدير Excel
                </Button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-steel-400 transition-colors hover:bg-steel-100 hover:text-steel-700 dark:hover:bg-steel-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable area */}
            <div id="report-print-area" className="p-5">
              {/* Print-only official header */}
              <div className="mb-5 hidden print:block">
                <p className="text-xl font-extrabold text-steel-900">
                  شركة نماء للتطوير — Namaa Development
                </p>
                <p className="text-base font-bold text-steel-800">
                  {report.title}
                </p>
                <p className="text-sm text-steel-600">
                  تاريخ الإصدار: {formatDate(report.generatedAt)}
                </p>
                <hr className="mt-3 border-steel-300" />
              </div>

              {/* Summary cards */}
              <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                {report.summary.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-steel-200 p-4 dark:border-steel-700"
                  >
                    <p className="text-xs text-steel-400">{s.label}</p>
                    <p
                      className={cn(
                        "mt-1 text-xl font-extrabold",
                        toneText[s.tone ?? "steel"],
                      )}
                    >
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-steel-200 dark:border-steel-700 print:border-0">
                <div className="max-h-[55vh] overflow-auto print:max-h-none print:overflow-visible">
                  <table className="w-full text-right text-sm">
                    <thead className="sticky top-0 z-10 bg-steel-50 dark:bg-steel-800/80">
                      <tr className="border-b border-steel-200 text-xs text-steel-500 dark:border-steel-700">
                        {report.columns.map((c) => (
                          <th key={c} className="whitespace-nowrap px-4 py-3 font-bold">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="print:hidden">
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={report.columns.length}
                            className="px-4 py-10 text-center text-sm text-steel-400"
                          >
                            لا توجد بيانات لهذا التقرير
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((row, ri) => (
                          <tr
                            key={ri}
                            className="border-b border-steel-50 last:border-0 odd:bg-steel-50/40 dark:border-steel-800/60 dark:odd:bg-steel-800/20"
                          >
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className={cn(
                                  "px-4 py-2.5 text-steel-700 dark:text-steel-200",
                                  isNumeric(ci)
                                    ? "text-center font-mono font-semibold"
                                    : "",
                                )}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tbody className="hidden print:table-row-group">
                      {rows.map((row, ri) => (
                        <tr
                          key={ri}
                          className="border-b border-steel-50 last:border-0"
                        >
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={cn(
                                "px-4 py-2.5 text-steel-700",
                                isNumeric(ci) ? "text-center font-mono" : "",
                              )}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 0 && (
                  <div className="print:hidden">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      total={total}
                      rangeStart={rangeStart}
                      rangeEnd={rangeEnd}
                    />
                  </div>
                )}
              </div>

              <p className="mt-4 text-center text-xs text-steel-400 print:hidden">
                إجمالي السجلات: {rows.length}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
