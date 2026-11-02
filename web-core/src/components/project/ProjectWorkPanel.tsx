import {
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ChevronDown,
  ChevronLeft,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { WorkAttachmentsBlock } from "./WorkExtras";
import { WorkCommentsModal } from "./WorkCommentsModal";
import { useHierarchy } from "../../store/HierarchyStore";
import { useAuth } from "../../store/AuthContext";
import { useCan } from "../../store/RbacContext";
import { useConfirm } from "../../store/ConfirmContext";
import {
  STAGE_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "../../lib/constants";
import {
  categoryProgress,
  normalizeStageStatus,
  stageTaskProgress,
} from "../../lib/workProgress";
import type {
  Priority,
  ProjectCategory,
  StageStatus,
  TaskItem,
  TaskStatus,
  WorkEntityType,
} from "../../models/domain";
import { cn } from "../../lib/cn";

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: TASK_STATUS_LABELS.todo },
  { value: "in_progress", label: TASK_STATUS_LABELS.in_progress },
  { value: "blocked", label: TASK_STATUS_LABELS.blocked },
  { value: "done", label: TASK_STATUS_LABELS.done },
  { value: "cancelled", label: TASK_STATUS_LABELS.cancelled },
];

const STAGE_STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: "planned", label: STAGE_STATUS_LABELS.planned },
  { value: "active", label: STAGE_STATUS_LABELS.active },
  { value: "completed", label: STAGE_STATUS_LABELS.completed },
  { value: "on_hold", label: STAGE_STATUS_LABELS.on_hold },
  { value: "cancelled", label: STAGE_STATUS_LABELS.cancelled },
];

type AddKind = "stage" | "category" | "task" | "subtask";
type DetailTarget =
  | { type: "stage"; id: string }
  | { type: "category"; id: string }
  | { type: "task"; id: string }
  | null;

type StatusTarget =
  | { kind: "stage"; id: string; status: StageStatus; title: string }
  | { kind: "task"; id: string; status: TaskStatus; title: string }
  | null;

type CommentsTarget = {
  entityType: Exclude<WorkEntityType, "project">;
  entityId: string;
  title: string;
} | null;

const STAGE_BADGE: Record<StageStatus, string> = {
  planned:
    "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:bg-steel-800/60 dark:text-steel-300",
  active:
    "border-brand-200 bg-brand-500/10 text-brand-700 dark:border-brand-800 dark:text-brand-300",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  on_hold:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:text-amber-200",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:text-red-300",
};

const TASK_BADGE: Record<TaskStatus, string> = {
  todo: "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:text-steel-300",
  in_progress:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:text-sky-300",
  blocked:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:text-amber-200",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:text-red-300",
};

function TreeToggle({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-steel-400 transition-colors duration-150 hover:bg-steel-100 hover:text-steel-700 dark:hover:bg-steel-800"
      aria-label={open ? "طي" : "توسيع"}
    >
      {open ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4 rotate-180 rtl:rotate-0" />
      )}
    </button>
  );
}

export function ProjectWorkPanel({ projectId }: { projectId: string }) {
  const {
    milestones,
    projectCategories,
    tasks,
    workComments,
    addMilestone,
    updateMilestone,
    removeMilestone,
    addProjectCategory,
    removeProjectCategory,
    addTask,
    updateTask,
    removeTask,
  } = useHierarchy();
  const { user, users } = useAuth();
  const can = useCan();
  const confirm = useConfirm();
  const canManage = can.manageRecords(user?.role);

  const stages = useMemo(
    () =>
      milestones
        .filter((m) => m.projectId === projectId)
        .sort((a, b) => a.order - b.order),
    [milestones, projectId],
  );

  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    () => new Set(stages.slice(0, 1).map((s) => s.id)),
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    () => new Set(),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<AddKind>("stage");
  const [addParentStageId, setAddParentStageId] = useState<string | null>(null);
  const [addParentCategoryId, setAddParentCategoryId] = useState<string | null>(
    null,
  );
  const [addParentTaskId, setAddParentTaskId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [error, setError] = useState("");

  const [detail, setDetail] = useState<DetailTarget>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [commentsTarget, setCommentsTarget] = useState<CommentsTarget>(null);

  const toggle = (
    set: Dispatch<SetStateAction<Set<string>>>,
    id: string,
  ) => {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAdd = (
    kind: AddKind,
    ctx?: { stageId?: string; categoryId?: string; taskId?: string },
  ) => {
    setAddKind(kind);
    setAddParentStageId(ctx?.stageId ?? null);
    setAddParentCategoryId(ctx?.categoryId ?? null);
    setAddParentTaskId(ctx?.taskId ?? null);
    setDraftName("");
    setDraftDesc("");
    setDraftDue(new Date().toISOString().slice(0, 10));
    setError("");
    setAddOpen(true);
  };

  const saveAdd = () => {
    if (!draftName.trim()) {
      setError("الاسم مطلوب.");
      return;
    }
    if (addKind === "stage") {
      const row = addMilestone({
        projectId,
        name: draftName.trim(),
        description: draftDesc.trim(),
        dueDate: draftDue || new Date().toISOString().slice(0, 10),
        status: "planned",
        completed: false,
        order: stages.length + 1,
      });
      setExpandedStages((prev) => new Set(prev).add(row.id));
    } else if (addKind === "category" && addParentStageId) {
      const cats = projectCategories.filter(
        (c) => c.stageId === addParentStageId,
      );
      const row = addProjectCategory({
        projectId,
        stageId: addParentStageId,
        name: draftName.trim(),
        description: draftDesc.trim(),
        order: cats.length + 1,
      });
      setExpandedStages((prev) => new Set(prev).add(addParentStageId));
      setExpandedCategories((prev) => new Set(prev).add(row.id));
    } else if (addKind === "task" && addParentCategoryId && addParentStageId) {
      const row = addTask({
        projectId,
        categoryId: addParentCategoryId,
        milestoneId: addParentStageId,
        title: draftName.trim(),
        description: draftDesc.trim(),
        status: "todo",
        priority: "normal" as Priority,
        assigneeUserId: user?.id,
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: draftDue || new Date().toISOString().slice(0, 10),
        progress: 0,
      });
      setExpandedCategories((prev) => new Set(prev).add(addParentCategoryId));
      setExpandedTasks((prev) => new Set(prev).add(row.id));
    } else if (addKind === "subtask" && addParentTaskId && addParentCategoryId) {
      addTask({
        projectId,
        categoryId: addParentCategoryId,
        parentTaskId: addParentTaskId,
        title: draftName.trim(),
        description: draftDesc.trim(),
        status: "todo",
        priority: "normal" as Priority,
        assigneeUserId: user?.id,
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: draftDue || new Date().toISOString().slice(0, 10),
        progress: 0,
      });
      setExpandedTasks((prev) => new Set(prev).add(addParentTaskId));
    } else {
      setError("تعذّر الحفظ. تأكد من المستوى المحدد.");
      return;
    }
    setAddOpen(false);
  };

  const saveStatus = () => {
    if (!statusTarget || !statusDraft) return;
    if (statusTarget.kind === "stage") {
      updateMilestone(statusTarget.id, {
        status: statusDraft as StageStatus,
      });
    } else {
      updateTask(statusTarget.id, { status: statusDraft as TaskStatus });
    }
    setStatusTarget(null);
  };

  const commentCount = (type: "stage" | "category" | "task", id: string) =>
    workComments.filter((c) => c.entityType === type && c.entityId === id)
      .length;

  const stageCats = (stageId: string) =>
    projectCategories
      .filter((c) => c.projectId === projectId && c.stageId === stageId)
      .sort((a, b) => a.order - b.order);

  const catTasks = (categoryId: string) =>
    tasks.filter(
      (t) =>
        t.projectId === projectId &&
        t.categoryId === categoryId &&
        !t.parentTaskId,
    );

  const childTasks = (taskId: string) =>
    tasks.filter((t) => t.parentTaskId === taskId);

  const detailStage =
    detail?.type === "stage"
      ? stages.find((s) => s.id === detail.id)
      : undefined;
  const detailCategory =
    detail?.type === "category"
      ? projectCategories.find((c) => c.id === detail.id)
      : undefined;
  const detailTask =
    detail?.type === "task" ? tasks.find((t) => t.id === detail.id) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-semibold text-steel-600 dark:text-steel-300">
            السهم للتوسيع · الاسم للتفاصيل · الأزرار للتعديل
          </p>
          <p className="text-[11px] text-steel-400">
            مرحلة ← فئة ← مهمة ← فرعية. التقدّم يُحسب تلقائياً من المستوى الأدنى.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => openAdd("stage")}>
            <Plus className="h-3.5 w-3.5" />
            إضافة مرحلة
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden p-0">
        {stages.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-steel-500">
            لا مراحل على هذا المشروع بعد.
          </p>
        ) : (
          <ul className="divide-y divide-steel-100 dark:divide-steel-800">
            {stages.map((stage) => {
              const open = expandedStages.has(stage.id);
              const cats = stageCats(stage.id);
              const pct = stageTaskProgress(stage, projectCategories, tasks);
              const st = normalizeStageStatus(stage);
              return (
                <li key={stage.id}>
                  <TreeRow
                    depth={0}
                    kindLabel="مرحلة"
                    title={stage.name}
                    meta={`استحقاق ${stage.dueDate} · ${cats.length} فئة`}
                    progress={pct}
                    statusLabel={STAGE_STATUS_LABELS[st]}
                    statusClass={STAGE_BADGE[st]}
                    open={open}
                    onToggle={() => toggle(setExpandedStages, stage.id)}
                    hasChildren={cats.length > 0 || canManage}
                    onOpenDetail={() =>
                      setDetail({ type: "stage", id: stage.id })
                    }
                    comments={commentCount("stage", stage.id)}
                    onComments={() =>
                      setCommentsTarget({
                        entityType: "stage",
                        entityId: stage.id,
                        title: stage.name,
                      })
                    }
                    onChangeStatus={
                      canManage
                        ? () => {
                            setStatusTarget({
                              kind: "stage",
                              id: stage.id,
                              status: st,
                              title: stage.name,
                            });
                            setStatusDraft(st);
                          }
                        : undefined
                    }
                    addLabel={canManage ? "إضافة فئة" : undefined}
                    onAdd={
                      canManage
                        ? () => openAdd("category", { stageId: stage.id })
                        : undefined
                    }
                    onDelete={
                      canManage
                        ? async () => {
                            const ok = await confirm({
                              title: "تأكيد الحذف",
                              message: "حذف المرحلة وفئاتها؟",
                              danger: true,
                              confirmLabel: "حذف",
                            });
                            if (!ok) return;
                            removeMilestone(stage.id);
                            if (detail?.id === stage.id) setDetail(null);
                          }
                        : undefined
                    }
                  />
                  {open ? (
                    <ul className="border-s-2 border-brand-200/70 bg-steel-50/50 dark:border-brand-900/50 dark:bg-steel-900/25">
                      {cats.length === 0 ? (
                        <li className="px-4 py-2.5 ps-14 text-[11px] text-steel-400">
                          لا فئات داخل هذه المرحلة. استخدم «إضافة فئة».
                        </li>
                      ) : null}
                      {cats.map((cat) => (
                        <CategoryBranch
                          key={cat.id}
                          cat={cat}
                          open={expandedCategories.has(cat.id)}
                          onToggle={() =>
                            toggle(setExpandedCategories, cat.id)
                          }
                          tasks={catTasks(cat.id)}
                          expandedTasks={expandedTasks}
                          onToggleTask={(id) => toggle(setExpandedTasks, id)}
                          childTasks={childTasks}
                          users={users}
                          canManage={canManage}
                          commentCount={commentCount}
                          onOpenDetail={setDetail}
                          onComments={setCommentsTarget}
                          onChangeTaskStatus={(task) => {
                            setStatusTarget({
                              kind: "task",
                              id: task.id,
                              status: task.status,
                              title: task.title,
                            });
                            setStatusDraft(task.status);
                          }}
                          onAddTask={() =>
                            openAdd("task", {
                              stageId: stage.id,
                              categoryId: cat.id,
                            })
                          }
                          onAddSubtask={(taskId) =>
                            openAdd("subtask", {
                              stageId: stage.id,
                              categoryId: cat.id,
                              taskId,
                            })
                          }
                          onRemoveCategory={async () => {
                            const ok = await confirm({
                              title: "تأكيد الحذف",
                              message: "حذف الفئة؟ تبقى المهام بلا فئة.",
                              danger: true,
                              confirmLabel: "حذف",
                            });
                            if (!ok) return;
                            removeProjectCategory(cat.id);
                            if (detail?.id === cat.id) setDetail(null);
                          }}
                          onRemoveTask={async (task) => {
                            const ok = await confirm({
                              title: "تأكيد الحذف",
                              message: "حذف المهمة ومهامها الفرعية؟",
                              danger: true,
                              confirmLabel: "حذف",
                            });
                            if (!ok) return;
                            removeTask(task.id);
                            if (detail?.id === task.id) setDetail(null);
                          }}
                          onRemoveSubtask={async (id) => {
                            const ok = await confirm({
                              title: "تأكيد الحذف",
                              message: "حذف المهمة الفرعية؟",
                              danger: true,
                              confirmLabel: "حذف",
                            });
                            if (ok) removeTask(id);
                          }}
                        />
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={
          addKind === "stage"
            ? "إضافة مرحلة"
            : addKind === "category"
              ? "إضافة فئة"
              : addKind === "task"
                ? "إضافة مهمة"
                : "إضافة مهمة فرعية"
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={saveAdd}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="الاسم" required>
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
          </Field>
          <Field label="الوصف">
            <Input
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
            />
          </Field>
          {addKind === "stage" ||
          addKind === "task" ||
          addKind === "subtask" ? (
            <Field label="الاستحقاق">
              <Input
                type="date"
                value={draftDue}
                onChange={(e) => setDraftDue(e.target.value)}
              />
            </Field>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={
          statusTarget
            ? `تغيير الحالة · ${statusTarget.title}`
            : "تغيير الحالة"
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>
              إلغاء
            </Button>
            <Button onClick={saveStatus} disabled={!statusDraft}>
              تطبيق
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold text-steel-600 dark:text-steel-300">
            اختر الحالة
          </p>
          <ul className="space-y-1.5">
            {(statusTarget?.kind === "stage"
              ? STAGE_STATUS_OPTIONS
              : TASK_STATUS_OPTIONS
            ).map((opt) => {
              const selected = statusDraft === opt.value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => setStatusDraft(opt.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-start text-sm font-semibold transition-colors duration-150",
                      selected
                        ? "border-brand-300 bg-brand-500/10 text-brand-700 dark:border-brand-700 dark:text-brand-300"
                        : "border-steel-200 text-steel-700 hover:bg-steel-50 dark:border-steel-700 dark:text-steel-200 dark:hover:bg-steel-800/50",
                    )}
                  >
                    {opt.label}
                    {selected ? (
                      <span className="text-[11px] font-bold text-brand-600">
                        محدّد
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {statusTarget?.kind === "task" ? (
            <p className="text-[11px] text-steel-400">
              منجز = 100٪ · للتنفيذ/ملغى = 0٪. إن وُجدت فرعيات يُحسب تقدّم
              المهمة من متوسطها.
            </p>
          ) : (
            <p className="text-[11px] text-steel-400">
              نسبة تقدّم المرحلة تُحسب من مهامها تلقائياً.
            </p>
          )}
        </div>
      </Modal>

      <WorkCommentsModal
        open={!!commentsTarget}
        onClose={() => setCommentsTarget(null)}
        projectId={projectId}
        entityType={commentsTarget?.entityType ?? "task"}
        entityId={commentsTarget?.entityId ?? ""}
        title={commentsTarget?.title ?? ""}
      />

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          detailStage
            ? `مرحلة · ${detailStage.name}`
            : detailCategory
              ? `فئة · ${detailCategory.name}`
              : detailTask
                ? `مهمة · ${detailTask.title}`
                : "التفاصيل"
        }
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setDetail(null)}>
            إغلاق
          </Button>
        }
      >
        {detailStage ? (
          <div className="space-y-3">
            <p className="text-sm text-steel-600 dark:text-steel-300">
              {detailStage.description?.trim() || "لا وصف للمرحلة."}
            </p>
            <p className="text-xs text-steel-500">
              الحالة:{" "}
              {STAGE_STATUS_LABELS[normalizeStageStatus(detailStage)]} · التقدّم:{" "}
              {stageTaskProgress(detailStage, projectCategories, tasks)}%
            </p>
            <WorkAttachmentsBlock
              projectId={projectId}
              entityType="stage"
              entityId={detailStage.id}
            />
          </div>
        ) : null}
        {detailCategory ? (
          <div className="space-y-3">
            <p className="text-sm text-steel-600 dark:text-steel-300">
              {detailCategory.description?.trim() || "لا وصف للفئة."}
            </p>
            <p className="text-xs text-steel-500">
              التقدّم: {categoryProgress(detailCategory.id, tasks)}%
            </p>
            <WorkAttachmentsBlock
              projectId={projectId}
              entityType="category"
              entityId={detailCategory.id}
            />
          </div>
        ) : null}
        {detailTask ? (
          <div className="space-y-3">
            <p className="text-sm text-steel-600 dark:text-steel-300">
              {detailTask.description?.trim() || "لا وصف."}
            </p>
            <p className="text-xs text-steel-500">
              {TASK_STATUS_LABELS[detailTask.status]} · {detailTask.progress}%
            </p>
            <WorkAttachmentsBlock
              projectId={projectId}
              entityType="task"
              entityId={detailTask.id}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function TextAction({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded border px-2 text-[11px] font-bold transition-colors duration-150",
        tone === "danger"
          ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
          : "border-steel-200 text-steel-600 hover:border-brand-300 hover:bg-brand-500/5 hover:text-brand-700 dark:border-steel-700 dark:text-steel-300",
      )}
    >
      {label}
    </button>
  );
}

function MoreMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        title="المزيد"
        aria-label="المزيد"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-steel-200 text-steel-400 transition-colors duration-150 hover:bg-steel-50 dark:border-steel-700 dark:hover:bg-steel-800"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="إغلاق القائمة"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute end-0 top-8 z-20 min-w-[7.5rem] rounded-md border border-steel-200 bg-white py-1 shadow-card dark:border-steel-700 dark:bg-steel-900">
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-start text-[11px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
            >
              حذف
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MiniProgress({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex min-w-[5.5rem] items-center gap-1.5">
      <div className="h-1.5 flex-1 rounded-full bg-steel-100 dark:bg-steel-800">
        <div
          className="h-1.5 rounded-full bg-brand-500 transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-[11px] font-bold text-steel-500">
        {pct}%
      </span>
    </div>
  );
}

function TreeRow({
  depth,
  kindLabel,
  title,
  meta,
  progress,
  statusLabel,
  statusClass,
  open,
  onToggle,
  hasChildren,
  onOpenDetail,
  comments,
  onComments,
  onChangeStatus,
  addLabel,
  onAdd,
  onDelete,
}: {
  depth: number;
  kindLabel: string;
  title: string;
  meta: string;
  progress?: number;
  statusLabel?: string;
  statusClass?: string;
  open?: boolean;
  onToggle?: () => void;
  hasChildren?: boolean;
  onOpenDetail: () => void;
  comments?: number;
  onComments?: () => void;
  onChangeStatus?: () => void;
  addLabel?: string;
  onAdd?: () => void;
  onDelete?: () => void;
}) {
  const pad = 12 + depth * 18;
  const isStage = depth === 0;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-steel-100 px-2 py-2.5 last:border-b-0 dark:border-steel-800/80",
        isStage && "bg-white dark:bg-steel-950/20",
        depth === 1 && "bg-transparent",
        depth >= 2 && "bg-white/60 dark:bg-steel-950/10",
      )}
      style={{ paddingInlineStart: pad }}
    >
      {hasChildren && onToggle ? (
        <TreeToggle open={!!open} onClick={onToggle} />
      ) : (
        <span className="inline-block h-7 w-7 shrink-0" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold",
              isStage
                ? "border-brand-200 bg-brand-500/10 text-brand-700 dark:border-brand-800 dark:text-brand-300"
                : depth === 1
                  ? "border-steel-200 bg-steel-50 text-steel-600 dark:border-steel-700 dark:bg-steel-800/60 dark:text-steel-300"
                  : depth === 2
                    ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
                    : "border-steel-200 bg-white text-steel-500 dark:border-steel-700 dark:bg-steel-900",
            )}
          >
            {kindLabel}
          </span>
          {statusLabel ? (
            <button
              type="button"
              disabled={!onChangeStatus}
              onClick={(e) => {
                e.stopPropagation();
                onChangeStatus?.();
              }}
              className={cn(
                "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold",
                statusClass,
                onChangeStatus &&
                  "cursor-pointer transition-opacity duration-150 hover:opacity-80",
              )}
              title={onChangeStatus ? "تغيير الحالة" : undefined}
            >
              {statusLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="min-w-0 truncate text-start text-sm font-semibold text-steel-800 hover:text-brand-700 dark:text-steel-100"
            onClick={onOpenDetail}
            title="فتح التفاصيل"
          >
            {title}
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-[11px] text-steel-400">{meta}</p>
          {typeof progress === "number" ? <MiniProgress value={progress} /> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {onComments ? (
          <TextAction
            label={`تعليقات (${comments ?? 0})`}
            onClick={onComments}
          />
        ) : null}
        {onChangeStatus ? (
          <TextAction label="الحالة" onClick={onChangeStatus} />
        ) : null}
        {onAdd && addLabel ? (
          <TextAction label={addLabel} onClick={onAdd} />
        ) : null}
        {onDelete ? <MoreMenu onDelete={onDelete} /> : null}
      </div>
    </div>
  );
}

function CategoryBranch({
  cat,
  open,
  onToggle,
  tasks,
  expandedTasks,
  onToggleTask,
  childTasks,
  users,
  canManage,
  commentCount,
  onOpenDetail,
  onComments,
  onChangeTaskStatus,
  onAddTask,
  onAddSubtask,
  onRemoveCategory,
  onRemoveTask,
  onRemoveSubtask,
}: {
  cat: ProjectCategory;
  open: boolean;
  onToggle: () => void;
  tasks: TaskItem[];
  expandedTasks: Set<string>;
  onToggleTask: (id: string) => void;
  childTasks: (taskId: string) => TaskItem[];
  users: { id: string; name: string }[];
  canManage: boolean;
  commentCount: (type: "stage" | "category" | "task", id: string) => number;
  onOpenDetail: (d: DetailTarget) => void;
  onComments: (c: CommentsTarget) => void;
  onChangeTaskStatus: (task: TaskItem) => void;
  onAddTask: () => void;
  onAddSubtask: (taskId: string) => void;
  onRemoveCategory: () => void;
  onRemoveTask: (task: TaskItem) => void;
  onRemoveSubtask: (id: string) => void;
}) {
  const pct = categoryProgress(cat.id, tasks);
  return (
    <li>
      <TreeRow
        depth={1}
        kindLabel="فئة"
        title={cat.name}
        meta={`${tasks.length} مهمة`}
        progress={pct}
        open={open}
        onToggle={onToggle}
        hasChildren={tasks.length > 0 || canManage}
        onOpenDetail={() => onOpenDetail({ type: "category", id: cat.id })}
        comments={commentCount("category", cat.id)}
        onComments={() =>
          onComments({
            entityType: "category",
            entityId: cat.id,
            title: cat.name,
          })
        }
        addLabel={canManage ? "إضافة مهمة" : undefined}
        onAdd={canManage ? onAddTask : undefined}
        onDelete={canManage ? onRemoveCategory : undefined}
      />
      {open ? (
        <ul className="border-s border-steel-200/80 dark:border-steel-700/60">
          {tasks.length === 0 ? (
            <li
              className="px-4 py-2 text-[11px] text-steel-400"
              style={{ paddingInlineStart: 56 }}
            >
              لا مهام في هذه الفئة. استخدم «إضافة مهمة».
            </li>
          ) : null}
          {tasks.map((task) => {
            const kids = childTasks(task.id);
            const taskOpen = expandedTasks.has(task.id);
            const assignee =
              users.find((u) => u.id === task.assigneeUserId)?.name ?? "—";
            return (
              <li key={task.id}>
                <TreeRow
                  depth={2}
                  kindLabel="مهمة"
                  title={task.title}
                  meta={`${assignee} · ${kids.length} فرعية`}
                  progress={task.progress}
                  statusLabel={TASK_STATUS_LABELS[task.status]}
                  statusClass={TASK_BADGE[task.status]}
                  open={taskOpen}
                  onToggle={() => onToggleTask(task.id)}
                  hasChildren={kids.length > 0 || canManage}
                  onOpenDetail={() =>
                    onOpenDetail({ type: "task", id: task.id })
                  }
                  comments={commentCount("task", task.id)}
                  onComments={() =>
                    onComments({
                      entityType: "task",
                      entityId: task.id,
                      title: task.title,
                    })
                  }
                  onChangeStatus={
                    canManage ? () => onChangeTaskStatus(task) : undefined
                  }
                  addLabel={canManage ? "إضافة فرعية" : undefined}
                  onAdd={canManage ? () => onAddSubtask(task.id) : undefined}
                  onDelete={canManage ? () => onRemoveTask(task) : undefined}
                />
                {taskOpen ? (
                  <ul className="border-s border-dashed border-steel-200 dark:border-steel-700">
                    {kids.length === 0 ? (
                      <li
                        className="px-4 py-2 text-[11px] text-steel-400"
                        style={{ paddingInlineStart: 72 }}
                      >
                        لا مهام فرعية. استخدم «إضافة فرعية».
                      </li>
                    ) : null}
                    {kids.map((st) => (
                      <li key={st.id}>
                        <TreeRow
                          depth={3}
                          kindLabel="فرعية"
                          title={st.title}
                          meta={`استحقاق ${st.dueDate}`}
                          progress={st.progress}
                          statusLabel={TASK_STATUS_LABELS[st.status]}
                          statusClass={TASK_BADGE[st.status]}
                          onOpenDetail={() =>
                            onOpenDetail({ type: "task", id: st.id })
                          }
                          comments={commentCount("task", st.id)}
                          onComments={() =>
                            onComments({
                              entityType: "task",
                              entityId: st.id,
                              title: st.title,
                            })
                          }
                          onChangeStatus={
                            canManage
                              ? () => onChangeTaskStatus(st)
                              : undefined
                          }
                          onDelete={
                            canManage
                              ? () => onRemoveSubtask(st.id)
                              : undefined
                          }
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
