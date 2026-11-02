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
import type { Project, ProjectExpense } from "../../models/domain";
import { cn } from "../../lib/cn";

function formatSar(amount: number): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

export function ProjectExpensesPanel({ project }: { project: Project }) {
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
      setError("البند مطلوب.");
      return;
    }
    const amountSar = Number(amount);
    if (!Number.isFinite(amountSar) || amountSar < 0) {
      setError("المبلغ غير صحيح.");
      return;
    }
    if (!date) {
      setError("التاريخ مطلوب.");
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
          <p className="text-[11px] font-bold text-steel-400">الميزانية</p>
          <p className="mt-0.5 text-sm font-extrabold tabular-nums">
            {formatSar(project.budgetSar || 0)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-bold text-steel-400">المنصرف</p>
          <p className="mt-0.5 text-sm font-extrabold tabular-nums">
            {formatSar(project.spentSar || 0)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-bold text-steel-400">المتبقي</p>
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
          <p className="text-[11px] font-bold text-steel-400">الاستهلاك</p>
          <p className="mt-0.5 text-sm font-extrabold tabular-nums">{spendPct}%</p>
        </Card>
      </div>

      <div className="flex justify-end">
        {canManage ? (
          <Button size="sm" onClick={openCreate}>
            إضافة مصروف
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
              <th className="px-4 py-3 text-start font-bold">التاريخ</th>
              <th className="px-4 py-3 text-start font-bold">البند</th>
              <th className="px-4 py-3 text-start font-bold">التصنيف</th>
              <th className="px-4 py-3 text-start font-bold">المبلغ</th>
              <th className="px-4 py-3 text-start font-bold">بواسطة</th>
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
                  لا مصاريف مسجّلة على هذا المشروع.
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
                            aria-label="تعديل"
                            title="تعديل"
                            onClick={() => openEdit(e)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                            aria-label="حذف"
                            title="حذف"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "تأكيد الحذف",
                                message: "حذف بند المصروف؟",
                                danger: true,
                                confirmLabel: "حذف",
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
        title={editing ? "تعديل مصروف" : "إضافة مصروف"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={save}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="البند" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="المبلغ (ر.س)" required>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="التاريخ" required>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="التصنيف">
            <Input
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              placeholder="مواد · معدات · استشارات"
            />
          </Field>
          <Field label="ملاحظة">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
