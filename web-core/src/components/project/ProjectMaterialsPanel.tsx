import { useMemo, useState } from "react";
import { Paperclip, Pencil, Trash2 } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field, Input, NativeSelect } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { WorkAttachmentsBlock } from "./WorkExtras";
import { useHierarchy } from "../../store/HierarchyStore";
import { useAuth } from "../../store/AuthContext";
import { useCan } from "../../store/RbacContext";
import { useConfirm } from "../../store/ConfirmContext";
import { useLocale } from "../../store/LocaleContext";
import { materialStatusLabel } from "../../i18n/label";
import type {
  Project,
  ProjectMaterial,
  ProjectMaterialStatus,
} from "../../models/domain";
import { cn } from "../../lib/cn";

const STATUS_OPTIONS: ProjectMaterialStatus[] = [
  "requested",
  "ordered",
  "received",
  "consumed",
  "cancelled",
];

const STATUS_BADGE: Record<ProjectMaterialStatus, string> = {
  requested:
    "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:text-steel-300",
  ordered:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:text-sky-300",
  received:
    "border-brand-200 bg-brand-500/10 text-brand-700 dark:border-brand-800 dark:text-brand-300",
  consumed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:text-red-300",
};

export function ProjectMaterialsPanel({ project }: { project: Project }) {
  const { t } = useLocale();
  const {
    projectMaterials,
    workAttachments,
    addProjectMaterial,
    updateProjectMaterial,
    removeProjectMaterial,
    addProjectActivity,
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

  const defaultUnit = t("projectMaterials.defaultUnit");

  const rows = useMemo(
    () =>
      projectMaterials
        .filter((m) => m.projectId === project.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [projectMaterials, project.id],
  );

  const attachmentCountByMaterial = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of workAttachments) {
      if (a.projectId !== project.id || a.entityType !== "material") continue;
      map.set(a.entityId, (map.get(a.entityId) ?? 0) + 1);
    }
    return map;
  }, [workAttachments, project.id]);

  const totalValue = rows
    .filter((m) => m.status !== "cancelled")
    .reduce((s, m) => s + m.quantity * m.unitCostSar, 0);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMaterial | null>(null);
  const [attachmentsFor, setAttachmentsFor] = useState<ProjectMaterial | null>(
    null,
  );
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState(defaultUnit);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState<ProjectMaterialStatus>("requested");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSku("");
    setUnit(defaultUnit);
    setQuantity("");
    setUnitCost("");
    setSupplier("");
    setStatus("requested");
    setNote("");
    setError("");
    setOpen(true);
  };

  const openEdit = (m: ProjectMaterial) => {
    setEditing(m);
    setName(m.name);
    setSku(m.sku);
    setUnit(m.unit);
    setQuantity(String(m.quantity));
    setUnitCost(String(m.unitCostSar));
    setSupplier(m.supplier);
    setStatus(m.status);
    setNote(m.note);
    setError("");
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) {
      setError(t("projectMaterials.error.nameRequired"));
      return;
    }
    const qty = Number(quantity);
    const cost = Number(unitCost);
    if (!Number.isFinite(qty) || qty < 0) {
      setError(t("projectMaterials.error.qtyInvalid"));
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setError(t("projectMaterials.error.costInvalid"));
      return;
    }
    const unitVal = unit.trim() || defaultUnit;
    if (editing) {
      updateProjectMaterial(editing.id, {
        name: name.trim(),
        sku: sku.trim(),
        unit: unitVal,
        quantity: qty,
        unitCostSar: cost,
        supplier: supplier.trim(),
        status,
        note: note.trim(),
      });
    } else if (user) {
      addProjectMaterial({
        projectId: project.id,
        name: name.trim(),
        sku: sku.trim(),
        unit: unitVal,
        quantity: qty,
        unitCostSar: cost,
        supplier: supplier.trim(),
        status,
        note: note.trim(),
        createdByUserId: user.id,
      });
      addProjectActivity({
        projectId: project.id,
        kind: "material",
        title: t("projectMaterials.activityAdded", { name: name.trim() }),
        detail: t("projectMaterials.activityDetail", {
          qty: String(qty),
          unit: unitVal,
          status: materialStatusLabel(t, status),
        }),
        actorUserId: user.id,
      });
    }
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-steel-500">{t("projectMaterials.intro")}</p>
          <p className="mt-0.5 text-[11px] font-bold tabular-nums text-steel-600">
            {t("projectMaterials.totalEstimate")}: {formatSar(totalValue)}
          </p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={openCreate}>
            {t("projectMaterials.add")}
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full min-w-[880px] table-fixed text-sm">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            {canManage ? <col className="w-[14%]" /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-steel-200 bg-steel-50 text-start dark:border-steel-700 dark:bg-steel-800/60">
              <th className="px-4 py-3 text-start font-bold">
                {t("projectMaterials.col.item")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("projectMaterials.col.qty")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("projectMaterials.col.unitCost")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("projectMaterials.col.value")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("projectMaterials.col.supplier")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("common.status")}
              </th>
              <th className="px-4 py-3 text-start font-bold">
                {t("projectMaterials.col.attachments")}
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
                  colSpan={canManage ? 8 : 7}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  {t("projectMaterials.empty")}
                </td>
              </tr>
            ) : (
              rows.map((m) => {
                const value = m.quantity * m.unitCostSar;
                const by =
                  users.find((u) => u.id === m.createdByUserId)?.name ?? "—";
                const attCount = attachmentCountByMaterial.get(m.id) ?? 0;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-steel-100 dark:border-steel-800"
                  >
                    <td className="px-4 py-3 align-middle">
                      <p className="truncate font-semibold text-steel-800 dark:text-steel-100">
                        {m.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-steel-400">
                        {m.sku || "—"}
                        <span className="mx-1.5 text-steel-300">·</span>
                        {by}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle tabular-nums text-steel-700">
                      {m.quantity.toLocaleString("en-US")} {m.unit}
                    </td>
                    <td className="px-4 py-3 align-middle tabular-nums">
                      {formatSar(m.unitCostSar)}
                    </td>
                    <td className="px-4 py-3 align-middle font-bold tabular-nums">
                      {formatSar(value)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="block truncate text-steel-600 dark:text-steel-300">
                        {m.supplier || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={cn(
                          "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-bold",
                          STATUS_BADGE[m.status],
                        )}
                      >
                        {materialStatusLabel(t, m.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded border border-steel-200 bg-white px-2 py-1 text-[11px] font-bold text-steel-600 transition-colors hover:border-brand-200 hover:bg-brand-500/5 hover:text-brand-700 dark:border-steel-700 dark:bg-steel-900"
                        onClick={() => setAttachmentsFor(m)}
                        title={t("projectMaterials.attachmentsTitle")}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        <span className="tabular-nums">{attCount}</span>
                      </button>
                    </td>
                    {canManage ? (
                      <td className="whitespace-nowrap px-3 py-3 align-middle">
                        <div className="inline-flex flex-nowrap items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-brand-500/10 hover:text-brand-600"
                            aria-label={t("common.edit")}
                            title={t("common.edit")}
                            onClick={() => openEdit(m)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={t("common.delete")}
                            title={t("common.delete")}
                            onClick={async () => {
                              const ok = await confirm({
                                title: t("common.confirmDeleteTitle"),
                                message: t("projectMaterials.deleteMessage"),
                                danger: true,
                                confirmLabel: t("common.delete"),
                              });
                              if (ok) removeProjectMaterial(m.id);
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
          editing ? t("projectMaterials.editTitle") : t("projectMaterials.addTitle")
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("projectMaterials.field.name")} required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("projectMaterials.field.sku")}>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </Field>
            <Field label={t("projectMaterials.field.unit")}>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={t("projectMaterials.unitPlaceholder")}
              />
            </Field>
            <Field label={t("projectMaterials.field.qty")} required>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
            <Field
              label={t("projectMaterials.field.unitCost", {
                currency: t("common.currencySar"),
              })}
              required
            >
              <Input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </Field>
            <Field label={t("common.status")}>
              <NativeSelect
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ProjectMaterialStatus)
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {materialStatusLabel(t, s)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label={t("projectMaterials.field.supplier")}>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </Field>
          <Field label={t("projectMaterials.field.note")}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(attachmentsFor)}
        onClose={() => setAttachmentsFor(null)}
        title={
          attachmentsFor
            ? t("projectMaterials.attachmentsModalTitle", {
                name: attachmentsFor.name,
              })
            : t("projectMaterials.attachmentsTitle")
        }
        footer={
          <Button variant="outline" onClick={() => setAttachmentsFor(null)}>
            {t("common.close")}
          </Button>
        }
      >
        {attachmentsFor ? (
          <WorkAttachmentsBlock
            projectId={project.id}
            entityType="material"
            entityId={attachmentsFor.id}
          />
        ) : null}
      </Modal>
    </div>
  );
}
