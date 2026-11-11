import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useHierarchy } from "../../store/HierarchyStore";
import { useAuth } from "../../store/AuthContext";
import { useCan } from "../../store/RbacContext";
import { useConfirm } from "../../store/ConfirmContext";
import { useLocale } from "../../store/LocaleContext";
import type { Project, ProjectExpense } from "../../models/domain";
import { cn } from "../../lib/cn";

export function ProjectExpensesPanel({ project }: { project: Project }) {
  const { t } = useLocale();
  const {
    projectExpenses,
    addProjectExpense,
    updateProjectExpense,
    removeProjectExpense,
  } = useHierarchy();
  const { user, users } = useAuth();
  const can = useCan();
  const confirm = useConfirm();
  const canManage = can.manageRecords(user?.role);

  const formatSar = (amount: number) =>
    `${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${t("common.currencySar")}`;

  const rows = useMemo(
    () =>
      projectExpenses
        .filter((e) => e.projectId === project.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [projectExpenses, project.id],
  );

  const remaining = (project.budgetSar || 0) - (project.spentSar || 0);
  const spendPct =
    project.budgetSar > 0
      ? Math.min(100, Math.round((project.spentSar / project.budgetSar) * 100))
      : 0;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectExpense | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setCategoryLabel("");
    setNote("");
    setError("");
    setOpen(true);
  };

  const openEdit = (e: ProjectExpense) => {
    setEditing(e);
    setTitle(e.title);
    setAmount(String(e.amountSar));
    setDate(e.date);
    setCategoryLabel(e.categoryLabel);
    setNote(e.note);
    setError("");
    setOpen(true);
  };

  const save = () => {
    if (!title.trim()) {
      setError(t("projectExpenses.error.titleRequired"));
      return;
    }
    const amountSar = Number(amount);
    if (!Number.isFinite(amountSar) || amountSar < 0) {
      setError(t("projectExpenses.error.amountInvalid"));
      return;
    }
    if (!date) {
      setError(t("projectExpenses.error.dateRequired"));
      return;
    }
    if (editing) {
      updateProjectExpense(editing.id, {
        title: title.trim(),
        amountSar,
        date,
        categoryLabel: categoryLabel.trim(),
        note: note.trim(),
      });
    } else if (user) {
      addProjectExpense({
        projectId: project.id,
        title: title.trim(),
        amountSar,
        date,
        categoryLabel: categoryLabel.trim(),
        note: note.trim(),
        createdByUserId: user.id,
      });
    }
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-[11px] font-bold text-steel-400">
            {t("common.budget")}
          </p>
          <p className="mt-0.5 text-sm font-extrabold tabular-nums">
            {formatSar(project.budgetSar || 0)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-bold text-steel-400">
            {t("common.spent")}
          </p>
          <p className="mt-0.5 text-sm font-extrabold tabular-nums">
            {formatSar(project.spentSar || 0)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-bold text-steel-400">
            {t("projectDetail.remaining")}
          </p>
          <p
            className={cn(
              "mt-0.5 text-sm font-extrabold tabular-nums",
              remaining < 0 && "text-red-600",
            )}
          >
            {formatSar(remaining)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-bold text-steel-400">
            {t("projectExpenses.consumption")}
          </p>
          <p className="mt-0.5 text-sm font-extrabold tabular-nums">
            {spendPct}%
          </p>
        </Card>
      </div>

      <div className="flex justify-end">
        {canManage ? (
          <Button size="sm" onClick={openCreate}>
            {t("projectExpenses.add")}
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[760px] table-fixed text-sm">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[30%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            {canManage ? <col className="w-[12%]" /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">
                {t("projectExpenses.col.date")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("projectExpenses.col.line")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("projectExpenses.col.category")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("projectExpenses.col.amount")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("projectExpenses.col.by")}
              </th>
              {canManage ? (
                <th className="px-4 py-3 text-start font-bold"> </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 6 : 5}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  {t("projectExpenses.empty")}
                </td>
              </tr>
            ) : (
              rows.map((e) => {
                const by =
                  users.find((u) => u.id === e.createdByUserId)?.name ?? "—";
                return (
                  <tr
                    key={e.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-4 py-3 align-middle tabular-nums text-steel-600 dark:text-steel-300">
                      {e.date}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <p className="truncate font-semibold text-steel-800 dark:text-steel-100">
                        {e.title}
                      </p>
                      {e.note ? (
                        <p className="mt-0.5 truncate text-[11px] text-steel-400">
                          {e.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="block truncate text-steel-600 dark:text-steel-300">
                        {e.categoryLabel || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle font-bold tabular-nums text-steel-800 dark:text-steel-100">
                      {formatSar(e.amountSar)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="block truncate text-steel-600 dark:text-steel-300">
                        {by}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="whitespace-nowrap px-3 py-3 align-middle">
                        <div className="inline-flex flex-nowrap items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-brand-500/10 hover:text-brand-600"
                            aria-label={t("common.edit")}
                            title={t("common.edit")}
                            onClick={() => openEdit(e)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                            aria-label={t("common.delete")}
                            title={t("common.delete")}
                            onClick={async () => {
                              const ok = await confirm({
                                title: t("common.confirmDeleteTitle"),
                                message: t("projectExpenses.deleteMessage"),
                                danger: true,
                                confirmLabel: t("common.delete"),
                              });
                              if (ok) removeProjectExpense(e.id);
                            }}
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
        onClose={() => setOpen(false)}
        title={
          editing ? t("projectExpenses.editTitle") : t("projectExpenses.addTitle")
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t("projectExpenses.field.line")} required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("projectExpenses.field.amount", {
                currency: t("common.currencySar"),
              })}
              required
            >
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label={t("projectExpenses.field.date")} required>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label={t("projectExpenses.field.category")}>
            <Input
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              placeholder={t("projectExpenses.categoryPlaceholder")}
            />
          </Field>
          <Field label={t("projectExpenses.field.note")}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
