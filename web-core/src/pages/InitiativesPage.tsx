import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { useConfirm } from "../store/ConfirmContext";
import { programsForInitiative, projectsForProgram } from "../lib/hierarchyLinks";
import type { Initiative } from "../models/domain";

export function InitiativesPage() {
  const {
    initiatives,
    objectives,
    programs,
    portfolios,
    projects,
    addInitiative,
    updateInitiative,
    updateProgram,
    removeInitiative,
  } = useHierarchy();
  const { user, organization, users } = useAuth();
  const can = useCan();
  const canManage = can.manageInitiative(user?.role);
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [programsFor, setProgramsFor] = useState<Initiative | null>(null);
  const [goalView, setGoalView] = useState<{
    initiativeName: string;
    text: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objectiveId, setObjectiveId] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [ownerUserId, setOwnerUserId] = useState(user?.id ?? "");
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initiatives.filter((ini) => {
      if (!q) return true;
      const objectiveText = ini.objectiveIds
        .map((id) => objectives.find((o) => o.id === id)?.title ?? "")
        .join(" ");
      const portfolioName =
        portfolios.find((p) => p.id === ini.portfolioId)?.name ?? "";
      const ownerName = users.find((u) => u.id === ini.ownerUserId)?.name ?? "";
      const programText = programsForInitiative(programs, ini.id)
        .map((p) => p.name)
        .join(" ");
      return (
        ini.name.toLowerCase().includes(q) ||
        ini.description.toLowerCase().includes(q) ||
        objectiveText.toLowerCase().includes(q) ||
        portfolioName.toLowerCase().includes(q) ||
        ownerName.toLowerCase().includes(q) ||
        programText.toLowerCase().includes(q)
      );
    });
  }, [initiatives, objectives, portfolios, programs, users, query]);

  const programsModalList = programsFor
    ? programsForInitiative(programs, programsFor.id)
    : [];

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setObjectiveId("");
    setPortfolioId("");
    setOwnerUserId(user?.id ?? "");
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (ini: Initiative) => {
    setEditingId(ini.id);
    setName(ini.name);
    setDescription(ini.description);
    setObjectiveId(ini.objectiveIds[0] ?? "");
    setPortfolioId(ini.portfolioId ?? "");
    setOwnerUserId(ini.ownerUserId ?? user?.id ?? "");
    setError("");
    setOpen(true);
  };

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    const ini = initiatives.find((i) => i.id === id);
    if (!ini) return;
    openEdit(ini);
    const next = new URLSearchParams(searchParams);
    next.delete("id");
    setSearchParams(next, { replace: true });
    // Open once when arriving with ?id=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, initiatives]);

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const save = () => {
    if (!name.trim() || !objectiveId || !ownerUserId || !portfolioId) {
      setError("الاسم والهدف والمسؤول والمحفظة مطلوبون.");
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      objectiveIds: [objectiveId],
      portfolioId,
      ownerUserId,
    };
    if (editingId) {
      updateInitiative(editingId, payload);
      for (const prg of programsForInitiative(programs, editingId)) {
        if (prg.portfolioId !== portfolioId) {
          updateProgram(prg.id, { portfolioId });
        }
      }
    } else {
      addInitiative({
        organizationId: organization?.id || "org-namaa",
        standaloneProjectIds: [],
        ...payload,
      });
    }
    closeModal();
  };

  const onDelete = async (ini: Initiative) => {
    const childPrograms = programsForInitiative(programs, ini.id);
    const msg =
      childPrograms.length > 0
        ? `حذف المبادرة «${ini.name}»؟ البرامج التابعة لن تُحذف، لكن يُزال ارتباطها.`
        : `حذف المبادرة «${ini.name}»؟`;
    const ok = await confirm({
      title: "تأكيد الحذف",
      message: msg,
      danger: true,
      confirmLabel: "حذف",
    });
    if (!ok) return;
    removeInitiative(ini.id);
  };

  const colSpan = canManage ? 6 : 5;

  return (
    <div className="space-y-4">
      <PageHeader
        title="المبادرات"
        subtitle="المحفظة ← المبادرة ← البرنامج. كل مبادرة تخدم هدفاً استراتيجياً."
        actions={
          canManage ? <Button onClick={openCreate}>إضافة مبادرة</Button> : null
        }
      />

      <Input
        placeholder="بحث بالاسم أو الهدف أو المحفظة أو البرنامج أو المسؤول"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="بحث في المبادرات"
      />

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[860px] table-fixed text-sm">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            {canManage ? <col className="w-[12%]" /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">المبادرة</th>
              <th className="px-4 py-3 text-start font-bold">الهدف</th>
              <th className="px-4 py-3 text-start font-bold">المحفظة</th>
              <th className="px-4 py-3 text-start font-bold">البرامج</th>
              <th className="px-4 py-3 text-start font-bold">المسؤول</th>
              {canManage ? (
                <th className="px-4 py-3 text-start font-bold"> </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {initiatives.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  لا توجد مبادرات. أضف مبادرة واربطها بمحفظة وهدف.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  لا نتائج مطابقة للبحث.
                </td>
              </tr>
            ) : (
              rows.map((ini) => {
                const goals = ini.objectiveIds
                  .map((id) => objectives.find((o) => o.id === id)?.title)
                  .filter((t): t is string => Boolean(t));
                const goalText = goals.join(" · ");
                const portfolio = portfolios.find(
                  (p) => p.id === ini.portfolioId,
                );
                const childPrograms = programsForInitiative(programs, ini.id);
                const owner =
                  users.find((u) => u.id === ini.ownerUserId)?.name ?? "—";
                return (
                  <tr
                    key={ini.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-4 py-3 align-middle">
                      <p className="truncate font-semibold text-steel-800 dark:text-steel-100">
                        {ini.name}
                      </p>
                      {ini.description ? (
                        <p className="mt-0.5 truncate text-[11px] text-steel-400">
                          {ini.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {goalText ? (
                        <button
                          type="button"
                          onClick={() =>
                            setGoalView({
                              initiativeName: ini.name,
                              text: goalText,
                            })
                          }
                          title={goalText}
                          className="block w-full truncate text-start text-sm text-steel-700 hover:text-brand-700 dark:text-steel-200"
                        >
                          {goalText}
                        </button>
                      ) : (
                        <span className="text-steel-400">—</span>
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
                        <span className="text-steel-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {childPrograms.length === 0 ? (
                        <span className="text-[12px] text-steel-400">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setProgramsFor(ini)}
                          className="inline-flex items-center rounded border border-steel-200 bg-steel-50 px-2 py-0.5 text-[11px] font-bold text-steel-700 hover:border-brand-300 hover:bg-brand-500/5 hover:text-brand-700 dark:border-steel-700 dark:bg-steel-800/60 dark:text-steel-200"
                        >
                          {childPrograms.length} برنامج
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="block truncate text-steel-700 dark:text-steel-200">
                        {owner}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="whitespace-nowrap px-3 py-3 align-middle">
                        <div className="inline-flex flex-nowrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(ini)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-brand-500/10 hover:text-brand-600"
                            title="تعديل"
                            aria-label="تعديل"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(ini)}
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
      </Card>

      <Modal
        open={open}
        onClose={closeModal}
        title={
          editingId
            ? canManage
              ? "تعديل مبادرة"
              : "تفاصيل المبادرة"
            : "إضافة مبادرة"
        }
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              {canManage ? "إلغاء" : "إغلاق"}
            </Button>
            {canManage ? <Button onClick={save}>حفظ</Button> : null}
          </>
        }
      >
        <div className="space-y-3">
          <Field label="اسم المبادرة" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!canManage}
              disabled={!canManage}
            />
          </Field>
          <Field label="ماذا تحقق" hint={canManage ? "جملة واحدة تكفي." : undefined}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              readOnly={!canManage}
              disabled={!canManage}
            />
          </Field>
          <Field label="المحفظة" required>
            <SearchableSelect
              value={portfolioId}
              onChange={setPortfolioId}
              placeholder="اختر المحفظة"
              disabled={!canManage}
              options={portfolios.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label="الهدف الاستراتيجي" required>
            <SearchableSelect
              value={objectiveId}
              onChange={setObjectiveId}
              placeholder="اختر الهدف"
              disabled={!canManage}
              options={objectives.map((o) => ({ value: o.id, label: o.title }))}
            />
          </Field>
          <Field label="المسؤول" required>
            <SearchableSelect
              value={ownerUserId}
              onChange={setOwnerUserId}
              placeholder="اختر المسؤول"
              disabled={!canManage}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={!!goalView}
        onClose={() => setGoalView(null)}
        title={
          goalView ? `الهدف · ${goalView.initiativeName}` : "الهدف الاستراتيجي"
        }
        size="sm"
        footer={
          <Button variant="outline" onClick={() => setGoalView(null)}>
            إغلاق
          </Button>
        }
      >
        <Field label="الهدف الاستراتيجي">
          <Textarea value={goalView?.text ?? ""} readOnly rows={4} />
        </Field>
      </Modal>

      <Modal
        open={!!programsFor}
        onClose={() => setProgramsFor(null)}
        title={
          programsFor
            ? `برامج المبادرة · ${programsFor.name}`
            : "برامج المبادرة"
        }
        footer={
          <Button variant="outline" onClick={() => setProgramsFor(null)}>
            إغلاق
          </Button>
        }
      >
        {programsModalList.length === 0 ? (
          <p className="text-sm text-steel-500">لا برامج تابعة لهذه المبادرة.</p>
        ) : (
          <ul className="space-y-2">
            {programsModalList.map((prg) => {
              const kids = projectsForProgram(projects, prg.id);
              const manager =
                users.find((u) => u.id === prg.managerUserId)?.name ?? "—";
              return (
                <li
                  key={prg.id}
                  className="rounded-lg border border-steel-200 px-3 py-2.5 dark:border-steel-700"
                >
                  <Link
                    to="/programs"
                    className="font-semibold text-brand-700 hover:underline"
                    onClick={() => setProgramsFor(null)}
                  >
                    {prg.name}
                  </Link>
                  <p className="mt-1 text-[11px] text-steel-400">
                    المدير: {manager}
                    <span className="mx-1.5 text-steel-300">·</span>
                    المشاريع: {kids.length}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
