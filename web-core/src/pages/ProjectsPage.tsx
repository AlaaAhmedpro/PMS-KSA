import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Pagination } from "../components/ui/Pagination";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { useConfirm } from "../store/ConfirmContext";
import { useOrgModules } from "../hooks/useOrgModules";
import { usePagination } from "../hooks/usePagination";
import { getProjectPlacement } from "../lib/orgModules";
import { PROJECT_STATUS_LABELS } from "../lib/constants";
import {
  filterProjectsForUser,
  saveProjectSimulated,
  validateProjectInput,
  ProjectServiceError,
} from "../services/projectService";
import type { Priority, Project, ProjectStatus } from "../models/domain";
import { cn } from "../lib/cn";

type ScopeTab = "all" | "under_program" | "standalone";

const TABS: { id: ScopeTab; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "under_program", label: "تحت برنامج" },
  { id: "standalone", label: "مستقلة" },
];

const PROJECT_STATUS_BADGE: Record<string, string> = {
  draft:
    "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:bg-steel-800/50 dark:text-steel-300",
  planned:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  active:
    "border-brand-200 bg-brand-500/10 text-brand-700 dark:border-brand-800 dark:text-brand-300",
  on_hold:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
};

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "منخفضة" },
  { value: "normal", label: "عادية" },
  { value: "high", label: "عالية" },
  { value: "critical", label: "حرجة" },
];

function formatSar(amount: number): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeParam = searchParams.get("scope");
  const scope: ScopeTab =
    scopeParam === "standalone"
      ? "standalone"
      : scopeParam === "under_program"
        ? "under_program"
        : "all";

  const {
    projects,
    portfolios,
    programs,
    addProject,
    updateProject,
    removeProject,
  } = useHierarchy();
  const { user, organization, users } = useAuth();
  const can = useCan();
  const confirm = useConfirm();
  const { modules } = useOrgModules();
  const canManage = can.manageRecords(user?.role);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [programId, setProgramId] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [managerUserId, setManagerUserId] = useState(user?.id ?? "");
  const [priority, setPriority] = useState<Priority>("normal");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [budgetSar, setBudgetSar] = useState("1000000");

  const scoped = useMemo(
    () =>
      filterProjectsForUser(projects, {
        role: String(user?.role ?? ""),
        userId: user?.id ?? "",
        scopedProjectIds: user?.scopedProjectIds,
      }),
    [projects, user],
  );

  const filtered = useMemo(() => {
    let list = scoped;
    if (scope === "standalone") {
      list = list.filter((p) => getProjectPlacement(p) !== "under_program");
    } else if (scope === "under_program") {
      list = list.filter((p) => getProjectPlacement(p) === "under_program");
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) => {
      const programName =
        programs.find((prg) => prg.id === p.programId)?.name ?? "";
      const portfolioName =
        portfolios.find((pf) => pf.id === p.portfolioId)?.name ?? "";
      const managerName =
        users.find((u) => u.id === p.managerUserId)?.name ?? "";
      return (
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        programName.toLowerCase().includes(term) ||
        portfolioName.toLowerCase().includes(term) ||
        managerName.toLowerCase().includes(term)
      );
    });
  }, [scoped, q, scope, statusFilter, programs, portfolios, users]);

  const { page, setPage, totalPages, paginated, total, rangeStart, rangeEnd } =
    usePagination(filtered, 8, [q, scope, statusFilter]);

  const selectedProgram = programs.find((p) => p.id === programId);
  const derivedPortfolio = selectedProgram
    ? portfolios.find((p) => p.id === selectedProgram.portfolioId)
    : portfolioId
      ? portfolios.find((p) => p.id === portfolioId)
      : undefined;

  const setScope = (next: ScopeTab) => {
    if (next === "all") setSearchParams({});
    else setSearchParams({ scope: next });
    setPage(1);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setDescription("");
    setProgramId("");
    setPortfolioId("");
    setManagerUserId(user?.id ?? "");
    setPriority("normal");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setBudgetSar("1000000");
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditingId(p.id);
    setName(p.name);
    setCode(p.code);
    setDescription(p.description);
    setProgramId(p.programId ?? "");
    setPortfolioId(p.portfolioId ?? "");
    setManagerUserId(p.managerUserId || user?.id || "");
    setPriority(p.priority);
    setStartDate(p.startDate);
    setEndDate(p.endDate);
    setBudgetSar(String(p.budgetSar || 0));
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const save = async () => {
    setError("");
    try {
      const budget = Number(budgetSar) || 0;
      validateProjectInput({
        name,
        code,
        startDate,
        endDate,
        budgetSar: budget,
      });
      if (!managerUserId) {
        throw new ProjectServiceError("مدير المشروع مطلوب.");
      }
      setBusy(true);
      await saveProjectSimulated();

      const resolvedProgramId =
        modules.program && programId ? programId : undefined;
      const fromProgram = resolvedProgramId
        ? programs.find((p) => p.id === resolvedProgramId)?.portfolioId
        : undefined;
      const resolvedPortfolioId = resolvedProgramId
        ? fromProgram
        : modules.portfolio
          ? portfolioId || undefined
          : undefined;

      const payload = {
        name: name.trim(),
        code: code.trim(),
        description: description.trim(),
        programId: resolvedProgramId,
        portfolioId: resolvedPortfolioId,
        standalone: !resolvedProgramId,
        managerUserId,
        priority,
        startDate,
        endDate,
        budgetSar: budget,
      };

      if (editingId) {
        updateProject(editingId, payload);
      } else {
        addProject({
          organizationId: organization?.id || "org-namaa",
          ...payload,
          status: "draft" as ProjectStatus,
          memberUserIds: managerUserId ? [managerUserId] : [],
          branchId: user?.branchId || "riyadh",
          departmentId: user?.departmentId || "pm",
          spentSar: 0,
        });
      }
      closeModal();
    } catch (e) {
      setError(e instanceof ProjectServiceError ? e.message : "تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (p: Project) => {
    const ok = await confirm({
      title: "تأكيد الحذف",
      message: `حذف المشروع «${p.name}» وكل مهامه؟`,
      danger: true,
      confirmLabel: "حذف",
    });
    if (!ok) return;
    removeProject(p.id);
  };

  const colSpan = canManage ? 8 : 7;

  return (
    <div className="space-y-4">
      <PageHeader
        title="المشاريع"
        subtitle="تحت برنامج أو مستقلة — فلتر النطاق من التبويبات أدناه."
        actions={
          canManage ? (
            <Button onClick={openCreate}>إضافة مشروع</Button>
          ) : undefined
        }
      />

      {(modules.portfolio || modules.program) && (
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setScope(t.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                scope === t.id
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-steel-200 text-steel-600 hover:bg-steel-50 dark:border-steel-700 dark:text-steel-300",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="بحث بالاسم أو الرمز أو البرنامج أو المدير"
          aria-label="بحث في المشاريع"
        />
        <SearchableSelect
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "كل الحالات" },
            ...Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[980px] table-fixed text-sm">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            {canManage ? <col className="w-[8%]" /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">المشروع</th>
              <th className="px-4 py-3 text-start font-bold">الحالة</th>
              <th className="px-4 py-3 text-start font-bold">البرنامج</th>
              <th className="px-4 py-3 text-start font-bold">المحفظة</th>
              <th className="px-4 py-3 text-start font-bold">المدير</th>
              <th className="px-4 py-3 text-start font-bold">التقدم</th>
              <th className="px-4 py-3 text-start font-bold">الميزانية</th>
              {canManage ? (
                <th className="px-4 py-3 text-start font-bold"> </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {total === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  لا توجد مشاريع مطابقة.
                </td>
              </tr>
            ) : (
              paginated.map((p) => {
                const program = programs.find((prg) => prg.id === p.programId);
                const portfolio = portfolios.find(
                  (pf) => pf.id === p.portfolioId,
                );
                const manager =
                  users.find((u) => u.id === p.managerUserId)?.name ?? "—";
                return (
                  <tr
                    key={p.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-4 py-3 align-middle">
                      <Link
                        to={`/projects/${p.id}`}
                        className="block truncate font-semibold text-brand-700 hover:underline"
                        title={p.name}
                      >
                        {p.name}
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-steel-400">
                        {p.code}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={cn(
                          "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-bold",
                          PROJECT_STATUS_BADGE[p.status] ??
                            PROJECT_STATUS_BADGE.draft,
                        )}
                      >
                        {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {program ? (
                        <Link
                          to="/programs"
                          className="block truncate font-semibold text-brand-700 hover:underline"
                          title={program.name}
                        >
                          {program.name}
                        </Link>
                      ) : (
                        <span className="text-[12px] text-steel-400">مستقل</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {portfolio ? (
                        <Link
                          to={`/portfolios/${portfolio.id}`}
                          className="block truncate font-semibold text-brand-700 hover:underline"
                          title={portfolio.name}
                        >
                          {portfolio.name}
                        </Link>
                      ) : (
                        <span className="text-steel-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="block truncate text-steel-700 dark:text-steel-200">
                        {manager}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 rounded-full bg-steel-100 dark:bg-steel-800">
                          <div
                            className="h-1.5 rounded-full bg-brand-500"
                            style={{
                              width: `${Math.min(100, Math.max(0, p.progress))}%`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 tabular-nums text-[11px] text-steel-500">
                          {p.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="whitespace-nowrap tabular-nums text-[12px] text-steel-700 dark:text-steel-200">
                        {formatSar(p.budgetSar || 0)}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="whitespace-nowrap px-2 py-3 align-middle">
                        <div className="inline-flex flex-nowrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-brand-500/10 hover:text-brand-600"
                            title="تعديل"
                            aria-label="تعديل"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(p)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                            title="حذف"
                            aria-label="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </Card>

      <Modal
        open={open}
        onClose={closeModal}
        title={editingId ? "تعديل مشروع" : "إضافة مشروع"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={busy}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم المشروع" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="الرمز" required>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
          </div>
          <Field label="الوصف" hint="جملة واحدة تكفي.">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.program ? (
              <Field
                label="البرنامج"
                className={
                  modules.portfolio && !programId ? undefined : "sm:col-span-2"
                }
              >
                <SearchableSelect
                  value={programId}
                  onChange={(v) => {
                    setProgramId(v);
                    if (v) {
                      const prg = programs.find((p) => p.id === v);
                      setPortfolioId(prg?.portfolioId ?? "");
                    }
                  }}
                  placeholder="مستقل — بدون برنامج"
                  options={[
                    { value: "", label: "مستقل — بدون برنامج" },
                    ...programs.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </Field>
            ) : null}
            {modules.portfolio && !programId ? (
              <Field label="المحفظة">
                <SearchableSelect
                  value={portfolioId}
                  onChange={setPortfolioId}
                  placeholder="بدون محفظة"
                  options={[
                    { value: "", label: "بدون محفظة" },
                    ...portfolios.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </Field>
            ) : null}
          </div>
          {derivedPortfolio && programId ? (
            <p className="text-[11px] text-steel-400">
              ضمن المحفظة: {derivedPortfolio.name}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="مدير المشروع" required>
              <SearchableSelect
                value={managerUserId}
                onChange={setManagerUserId}
                placeholder="اختر المدير"
                options={users.map((u) => ({ value: u.id, label: u.name }))}
              />
            </Field>
            <Field label="الأولوية">
              <SearchableSelect
                value={priority}
                onChange={(v) => setPriority(v as Priority)}
                options={PRIORITY_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="البداية" required>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="النهاية" required>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
            <Field label="الميزانية (ر.س)">
              <Input
                type="number"
                value={budgetSar}
                onChange={(e) => setBudgetSar(e.target.value)}
              />
            </Field>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
