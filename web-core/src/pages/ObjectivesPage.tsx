import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { useHierarchy } from "../store/HierarchyStore";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { useConfirm } from "../store/ConfirmContext";
import type { StrategicObjective } from "../models/domain";

export function ObjectivesPage() {
  const {
    objectives,
    initiatives,
    addObjective,
    updateObjective,
    removeObjective,
  } = useHierarchy();
  const { user, organization } = useAuth();
  const can = useCan();
  const canManage = can.manageInitiative(user?.role);
  const confirm = useConfirm();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initiativesFor, setInitiativesFor] =
    useState<StrategicObjective | null>(null);
  const [descView, setDescView] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetYear, setTargetYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return objectives.filter((o) => {
      if (!q) return true;
      return (
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        String(o.targetYear).includes(q)
      );
    });
  }, [objectives, query]);

  const linkedInitiatives = initiativesFor
    ? initiatives.filter((i) => i.objectiveIds.includes(initiativesFor.id))
    : [];

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setTargetYear(String(new Date().getFullYear()));
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (o: StrategicObjective) => {
    setEditingId(o.id);
    setTitle(o.title);
    setDescription(o.description);
    setTargetYear(String(o.targetYear));
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const save = () => {
    const year = Number(targetYear);
    if (!title.trim() || !Number.isFinite(year) || year < 2000 || year > 2100) {
      setError("العنوان وسنة مستهدفة صحيحة مطلوبان.");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      targetYear: year,
    };
    if (editingId) {
      updateObjective(editingId, payload);
    } else {
      addObjective({
        organizationId: organization?.id || "org-namaa",
        ...payload,
      });
    }
    closeModal();
  };

  const onDelete = async (o: StrategicObjective) => {
    const linked = initiatives.filter((i) => i.objectiveIds.includes(o.id));
    const msg =
      linked.length > 0
        ? `حذف الهدف «${o.title}»؟ سيُزال من المبادرات المرتبطة دون حذفها.`
        : `حذف الهدف «${o.title}»؟`;
    const ok = await confirm({
      title: "تأكيد الحذف",
      message: msg,
      danger: true,
      confirmLabel: "حذف",
    });
    if (!ok) return;
    removeObjective(o.id);
  };

  const colSpan = canManage ? 5 : 4;

  return (
    <div className="space-y-4">
      <PageHeader
        title="الأهداف الاستراتيجية"
        subtitle="أعلى الطبقة الاستراتيجية — المبادرات تدعم تحقيقها."
        actions={
          canManage ? <Button onClick={openCreate}>إضافة هدف</Button> : null
        }
      />

      <Input
        placeholder="بحث بالعنوان أو الوصف أو السنة"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="بحث في الأهداف"
      />

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[800px] table-fixed text-sm">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[28%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            {canManage ? <col className="w-[12%]" /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">الهدف</th>
              <th className="px-4 py-3 text-start font-bold">الوصف</th>
              <th className="px-4 py-3 text-start font-bold">السنة</th>
              <th className="px-4 py-3 text-start font-bold">المبادرات</th>
              {canManage ? (
                <th className="px-4 py-3 text-start font-bold"> </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {objectives.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  لا توجد أهداف مسجّلة.
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
              rows.map((o) => {
                const linked = initiatives.filter((i) =>
                  i.objectiveIds.includes(o.id),
                );
                return (
                  <tr
                    key={o.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-4 py-3 align-middle">
                      <p className="truncate font-semibold text-steel-800 dark:text-steel-100">
                        {o.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {o.description ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDescView({ title: o.title, text: o.description })
                          }
                          title={o.description}
                          className="block w-full truncate text-start text-sm text-steel-700 hover:text-brand-700 dark:text-steel-200"
                        >
                          {o.description}
                        </button>
                      ) : (
                        <span className="text-steel-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="tabular-nums text-steel-700 dark:text-steel-200">
                        {o.targetYear}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {linked.length === 0 ? (
                        <span className="text-[12px] text-steel-400">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setInitiativesFor(o)}
                          className="inline-flex items-center rounded border border-steel-200 bg-steel-50 px-2 py-0.5 text-[11px] font-bold text-steel-700 hover:border-brand-300 hover:bg-brand-500/5 hover:text-brand-700 dark:border-steel-700 dark:bg-steel-800/60 dark:text-steel-200"
                        >
                          {linked.length} مبادرة
                        </button>
                      )}
                    </td>
                    {canManage ? (
                      <td className="whitespace-nowrap px-3 py-3 align-middle">
                        <div className="inline-flex flex-nowrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(o)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-brand-500/10 hover:text-brand-600"
                            title="تعديل"
                            aria-label="تعديل"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(o)}
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
        title={editingId ? "تعديل هدف" : "إضافة هدف"}
        subtitle={editingId ? undefined : "إضافة هدف استراتيجي للمنشأة"}
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              إلغاء
            </Button>
            <Button onClick={save}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="عنوان الهدف" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="الوصف" hint="جملة واحدة تكفي.">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="السنة المستهدفة" required>
            <Input
              type="number"
              value={targetYear}
              onChange={(e) => setTargetYear(e.target.value)}
              min={2000}
              max={2100}
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={!!descView}
        onClose={() => setDescView(null)}
        title={descView ? `الوصف · ${descView.title}` : "الوصف"}
        size="sm"
        footer={
          <Button variant="outline" onClick={() => setDescView(null)}>
            إغلاق
          </Button>
        }
      >
        <Field label="وصف الهدف">
          <Textarea value={descView?.text ?? ""} readOnly rows={4} />
        </Field>
      </Modal>

      <Modal
        open={!!initiativesFor}
        onClose={() => setInitiativesFor(null)}
        title={
          initiativesFor
            ? `مبادرات الهدف · ${initiativesFor.title}`
            : "المبادرات المرتبطة"
        }
        footer={
          <Button variant="outline" onClick={() => setInitiativesFor(null)}>
            إغلاق
          </Button>
        }
      >
        {linkedInitiatives.length === 0 ? (
          <p className="text-sm text-steel-500">لا مبادرات مرتبطة بهذا الهدف.</p>
        ) : (
          <ul className="space-y-2">
            {linkedInitiatives.map((ini) => (
              <li
                key={ini.id}
                className="rounded-lg border border-steel-200 px-3 py-2.5 dark:border-steel-700"
              >
                <Link
                  to={`/initiatives?id=${ini.id}`}
                  className="font-semibold text-brand-700 hover:underline"
                  onClick={() => setInitiativesFor(null)}
                >
                  {ini.name}
                </Link>
                {ini.description ? (
                  <p className="mt-1 text-[11px] text-steel-400">
                    {ini.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
