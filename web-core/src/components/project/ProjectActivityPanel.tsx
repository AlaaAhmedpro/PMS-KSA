import { useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useHierarchy } from "../../store/HierarchyStore";
import { useAuth } from "../../store/AuthContext";
import { useCan } from "../../store/RbacContext";
import { useConfirm } from "../../store/ConfirmContext";
import { PROJECT_ACTIVITY_KIND_LABELS } from "../../lib/constants";
import type { Project, ProjectActivityKind } from "../../models/domain";
import { cn } from "../../lib/cn";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

const KIND_TONE: Record<string, string> = {
  note: "border-steel-300 bg-steel-50 text-steel-600",
  status: "border-brand-200 bg-brand-500/10 text-brand-700",
  stage: "border-emerald-200 bg-emerald-50 text-emerald-700",
  task: "border-sky-200 bg-sky-50 text-sky-700",
  team: "border-brand-200 bg-brand-500/5 text-brand-700",
  expense: "border-amber-200 bg-amber-50 text-amber-800",
  document: "border-steel-200 bg-white text-steel-600",
  material: "border-amber-200 bg-amber-50/80 text-amber-800",
  comment: "border-steel-200 bg-steel-50 text-steel-600",
};

export function ProjectActivityPanel({ project }: { project: Project }) {
  const { projectActivities, addProjectActivity, removeProjectActivity } =
    useHierarchy();
  const { user, users } = useAuth();
  const can = useCan();
  const confirm = useConfirm();
  const canManage = can.manageRecords(user?.role);

  const rows = useMemo(
    () =>
      projectActivities
        .filter((a) => a.projectId === project.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [projectActivities, project.id],
  );

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-steel-500">
          سجل زمني لأحداث المشروع: حالات، مراحل، فريق، مصاريف، مواد، وملاحظات.
        </p>
        {canManage ? (
          <Button
            size="sm"
            onClick={() => {
              setTitle("");
              setDetail("");
              setError("");
              setOpen(true);
            }}
          >
            إضافة ملاحظة
          </Button>
        ) : null}
      </div>

      <Card className="p-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-steel-500">
            لا نشاطات مسجّلة على هذا المشروع.
          </p>
        ) : (
          <ol className="relative space-y-0 ps-2">
            {rows.map((a, i) => {
              const actor =
                users.find((u) => u.id === a.actorUserId)?.name ?? "—";
              const kind = a.kind as ProjectActivityKind;
              const isLast = i === rows.length - 1;
              return (
                <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {!isLast ? (
                    <span
                      className="absolute start-[7px] top-4 bottom-0 w-px bg-steel-200 dark:bg-steel-700"
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className="relative z-[1] mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand-500 bg-white dark:bg-steel-900"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 rounded-md border border-steel-200 px-3 py-2.5 dark:border-steel-700">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold",
                              KIND_TONE[kind] ?? KIND_TONE.note,
                            )}
                          >
                            {PROJECT_ACTIVITY_KIND_LABELS[kind] ?? kind}
                          </span>
                          <p className="text-sm font-semibold text-steel-800 dark:text-steel-100">
                            {a.title}
                          </p>
                        </div>
                        {a.detail ? (
                          <p className="mt-1 text-[13px] leading-relaxed text-steel-600 dark:text-steel-300">
                            {a.detail}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[11px] text-steel-400">
                          <span className="font-semibold text-steel-500">
                            {actor}
                          </span>
                          <span className="mx-1.5 text-steel-300">·</span>
                          <span className="tabular-nums">
                            {formatDateTime(a.createdAt)}
                          </span>
                        </p>
                      </div>
                      {canManage && a.kind === "note" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "تأكيد الحذف",
                              message: "حذف هذه الملاحظة من السجل؟",
                              danger: true,
                              confirmLabel: "حذف",
                            });
                            if (ok) removeProjectActivity(a.id);
                          }}
                        >
                          حذف
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة ملاحظة للسجل"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!title.trim()) {
                  setError("العنوان مطلوب.");
                  return;
                }
                if (!user) return;
                addProjectActivity({
                  projectId: project.id,
                  kind: "note",
                  title: title.trim(),
                  detail: detail.trim(),
                  actorUserId: user.id,
                });
                setOpen(false);
              }}
            >
              حفظ
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="العنوان" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="التفاصيل">
            <Textarea
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
