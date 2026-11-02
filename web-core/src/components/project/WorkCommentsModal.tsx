import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Input";
import { useAuth } from "../../store/AuthContext";
import { useHierarchy } from "../../store/HierarchyStore";
import { useCan } from "../../store/RbacContext";
import { useConfirm } from "../../store/ConfirmContext";
import type { WorkEntityType } from "../../models/domain";

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

export function WorkCommentsModal({
  open,
  onClose,
  projectId,
  entityType,
  entityId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  entityType: Exclude<WorkEntityType, "project">;
  entityId: string;
  title: string;
}) {
  const {
    workComments,
    addWorkComment,
    updateWorkComment,
    removeWorkComment,
  } = useHierarchy();
  const { user, users } = useAuth();
  const can = useCan();
  const confirm = useConfirm();
  const canManage = can.manageRecords(user?.role);

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const rows = useMemo(
    () =>
      workComments
        .filter(
          (c) =>
            c.projectId === projectId &&
            c.entityType === entityType &&
            c.entityId === entityId,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [workComments, projectId, entityType, entityId],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`التعليقات · ${title}`}
      size="md"
      footer={
        <Button variant="outline" onClick={onClose}>
          إغلاق
        </Button>
      }
    >
      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-steel-500">لا تعليقات بعد.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((c) => {
              const author =
                users.find((u) => u.id === c.authorUserId)?.name ?? "—";
              const isEditing = editingId === c.id;
              return (
                <li
                  key={c.id}
                  className="rounded-md border border-steel-200 px-3 py-2.5 dark:border-steel-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-steel-600 dark:text-steel-300">
                        {author}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-steel-400">
                        أُضيف في {formatDateTime(c.createdAt)}
                        {c.updatedAt ? (
                          <>
                            <span className="mx-1.5 text-steel-300">·</span>
                            عُدّل {formatDateTime(c.updatedAt)}
                          </>
                        ) : null}
                      </p>
                    </div>
                    {canManage ? (
                      <div className="inline-flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-steel-400 hover:bg-brand-500/10 hover:text-brand-600"
                          aria-label="تعديل التعليق"
                          title="تعديل"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditText(c.text);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-steel-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="حذف التعليق"
                          title="حذف"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "تأكيد الحذف",
                              message: "حذف هذا التعليق؟",
                              danger: true,
                              confirmLabel: "حذف",
                            });
                            if (ok) removeWorkComment(c.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={!editText.trim()}
                          onClick={() => {
                            updateWorkComment(c.id, editText.trim());
                            setEditingId(null);
                            setEditText("");
                          }}
                        >
                          حفظ التعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-steel-700 dark:text-steel-200">
                      {c.text}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canManage && user ? (
          <div className="space-y-2 border-t border-steel-100 pt-3 dark:border-steel-800">
            <Field label="تعليق جديد">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="اكتب تعليقاً مختصراً"
              />
            </Field>
            <Button
              size="sm"
              disabled={!draft.trim()}
              onClick={() => {
                addWorkComment({
                  projectId,
                  entityType,
                  entityId,
                  authorUserId: user.id,
                  text: draft.trim(),
                });
                setDraft("");
              }}
            >
              إضافة تعليق
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
