import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Pencil,
  Mail,
  FileText,
  Eye,
  CheckCircle2,
  Send,
  Inbox,
  GitBranch,
  Loader,
  Lock,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Field, Textarea } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { UrgentModal } from "../components/common/UrgentModal";
import { ActionEntryCard } from "../components/common/ActionEntryCard";
import { EmptyState } from "../components/ui/EmptyState";
import { FileUpload } from "../components/ui/FileUpload";
import { useData } from "../store/DataStore";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { useNotifications } from "../store/NotificationStore";
import { effectiveStatus, overdueDays } from "../lib/status";
import { categoryLabel } from "../lib/categoryHelpers";
import { formatDate, formatDateTime, formatNumber, todayISO } from "../lib/format";
import { buildAssignmentNotification } from "../lib/notifications";
import { canUserAddAction, canUserMarkRecordDone, getActorTitle } from "../lib/actionHelpers";
import { cn } from "../lib/cn";
import type { ActionEntry, Attachment, RecordKind, Status } from "../lib/types";

const WORKFLOW = [
  { key: "received", label: "الاستلام والتسجيل", icon: Inbox },
  { key: "referred", label: "الإحالة والتوجيه", icon: GitBranch },
  { key: "executed", label: "التنفيذ", icon: Loader },
  { key: "closed", label: "الاعتماد والإغلاق", icon: Lock },
];

function workflowStep(status: Status): number {
  switch (status) {
    case "new":
      return 1;
    case "active":
    case "overdue":
      return 2;
    case "done":
      return 3;
    case "closed":
      return 4;
    default:
      return 1;
  }
}

export function RecordDetail({ kind }: { kind: RecordKind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, updateRecord, entities, branches, departments, categories } =
    useData();
  const { user, users } = useAuth();
  const { addNotification } = useNotifications();
  const can = useCan();
  const record = records.find((r) => r.id === id);
  const [note, setNote] = useState("");
  const [actionAttachments, setActionAttachments] = useState<Attachment[]>([]);
  const [urgent, setUrgent] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);

  const base = kind === "project" ? "/projects" : "/tasks";

  if (!record) {
    return (
      <EmptyState
        title="السجل غير موجود"
        action={
          <Button onClick={() => navigate(base)}>العودة للقائمة</Button>
        }
      />
    );
  }

  const status = effectiveStatus(record);
  const entity = entities.find((e) => e.id === record.entityId);
  const branch = branches.find((b) => b.id === record.branchId);
  const dept = departments.find((d) => d.id === record.departmentId);
  const step = workflowStep(status);
  const actions = record.actions ?? [];
  const mayAddAction = canUserAddAction(
    user,
    record,
    status,
    can.execute(user?.role),
  );
  const mayMarkDone = canUserMarkRecordDone(
    user,
    record,
    status,
    can.execute(user?.role),
  );

  const changeStatus = (newStatus: Status, logText: string) => {
    if (
      newStatus === "done" &&
      !canUserMarkRecordDone(user, record, status, can.execute(user?.role))
    ) {
      return;
    }
    updateRecord(record.id, (r) => ({
      status: newStatus,
      executedDate:
        newStatus === "done" && !r.executedDate ? todayISO() : r.executedDate,
      log: [
        ...r.log,
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          actor: user?.name || "مستخدم",
          text: logText,
        },
      ],
    }));

    if (newStatus === "active" && record.assignee) {
      const payload = buildAssignmentNotification(users, {
        assigneeName: record.assignee,
        recordId: record.id,
        kind: record.kind,
        subject: record.subject,
        regNumber: record.regNumber,
        referredBy: user?.name,
      });
      if (payload) addNotification(payload);
    }
  };

  const addAction = () => {
    if (!note.trim() || !user || !mayAddAction) return;
    const entry: ActionEntry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actorId: user.id,
      actorName: user.name,
      actorTitle: getActorTitle(user, record),
      text: note.trim(),
      attachments: actionAttachments,
    };
    updateRecord(record.id, (r) => ({
      notes: note.trim(),
      actions: [...(r.actions ?? []), entry],
      log: [
        ...r.log,
        {
          id: crypto.randomUUID(),
          at: entry.at,
          actor: user.name,
          text: `إضافة إجراء: ${note.trim()}`,
        },
      ],
    }));
    setNote("");
    setActionAttachments([]);
  };

  return (
    <div>
      <PageHeader
        title={record.subject}
        subtitle={`رقم القيد: ${record.regNumber}`}
        icon={<FileText className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate(base)}>
              <ArrowRight className="h-4 w-4" />
              رجوع
            </Button>
            {can.sendUrgent(user?.role) && status === "overdue" && (
              <Button variant="danger" onClick={() => setUrgent(true)}>
                <Mail className="h-4 w-4" />
                استعجال فوري
              </Button>
            )}
            {can.manageRecords(user?.role) && (
              <Button variant="outline" onClick={() => navigate(`${base}/${record.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                تعديل
              </Button>
            )}
          </div>
        }
      />

      {/* Workflow stepper */}
      <Card className="mb-4 p-5">
        <div className="flex items-center justify-between">
          {WORKFLOW.map((w, i) => {
            const done = i + 1 < step;
            const current = i + 1 === step;
            return (
              <div key={w.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
                      done && "bg-brand-500 text-white",
                      current && "bg-brand-500/15 text-brand-600 ring-2 ring-brand-500 dark:text-brand-400",
                      !done && !current && "bg-steel-100 text-steel-400 dark:bg-steel-800",
                    )}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <w.icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={cn(
                      "text-center text-xs font-semibold",
                      current ? "text-brand-600 dark:text-brand-400" : "text-steel-500",
                    )}
                  >
                    {w.label}
                  </span>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 flex-1 rounded-full",
                      done ? "bg-brand-500" : "bg-steel-200 dark:bg-steel-800",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="تفاصيل السجل"
              action={<StatusBadge status={status} />}
            />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 pt-0 md:grid-cols-3">
              <Detail label="الجهة المعنية" value={entity?.name} />
              <Detail label="رقم الصادر" value={record.outNumber} />
              <Detail
                label="التصنيف"
                value={categoryLabel(categories, record.category)}
              />
              <Detail label="تاريخ الورود" value={formatDate(record.arrivalDate)} />
              <Detail label="تاريخ المرجع" value={formatDate(record.letterDate)} />
              <Detail label="التاريخ المنتظر" value={formatDate(record.deadline)} />
              <Detail label="الفرع / المنطقة" value={branch?.name} />
              <Detail label="الإدارة" value={dept?.name} />
              <Detail label="المسؤول المعيّن" value={record.assignee} />
              {record.executedDate && (
                <Detail label="تاريخ التنفيذ الفعلي" value={formatDate(record.executedDate)} />
              )}
              {status === "overdue" && (
                <div>
                  <p className="text-xs text-steel-400">أيام التأخير</p>
                  <p className="font-bold text-red-500">
                    {formatNumber(overdueDays(record))} أيام
                  </p>
                </div>
              )}
            </div>
            {record.notes && (
              <div className="mx-5 mb-5 rounded-xl bg-steel-50 p-4 dark:bg-steel-800/50">
                <p className="text-xs font-bold text-steel-400">ملاحظات الإجراء المتخذ</p>
                <p className="mt-1 text-sm text-steel-700 dark:text-steel-200">{record.notes}</p>
              </div>
            )}
          </Card>

          {/* Actions taken by assignee / manager */}
          <Card>
            <CardHeader
              title="الإجراءات المتخذة"
              subtitle={`${actions.length} إجراء`}
            />
            <div className="space-y-3 p-5 pt-0">
              {actions.length === 0 ? (
                <p className="py-8 text-center text-sm text-steel-400">
                  لم يُضف أي إجراء بعد
                </p>
              ) : (
                [...actions].reverse().map((action) => (
                  <ActionEntryCard
                    key={action.id}
                    action={action}
                    onPreview={setPreview}
                  />
                ))
              )}
            </div>
          </Card>

          {/* Original letter attachments */}
          <Card>
            <CardHeader title="المرفقات الأصلية" subtitle={`${record.attachments.length} ملف`} />
            <div className="p-5 pt-0">
              {record.attachments.length === 0 ? (
                <p className="py-6 text-center text-sm text-steel-400">لا توجد مرفقات</p>
              ) : (
                <div className="space-y-2">
                  {record.attachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl border border-steel-200 p-3 dark:border-steel-700"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="flex-1 truncate text-sm font-semibold text-steel-700 dark:text-steel-200">
                        {a.name}
                      </p>
                      <button
                        onClick={() => setPreview(a)}
                        className="rounded-lg p-2 text-steel-400 hover:bg-steel-100 hover:text-brand-600 dark:hover:bg-steel-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Action panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="إجراءات سير العمل" />
            <div className="space-y-2 p-5 pt-0">
              {can.manageRecords(user?.role) && status === "new" && (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => changeStatus("active", "بدء التنفيذ وإحالة للمختص.")}
                >
                  بدء التنفيذ
                </Button>
              )}
              {mayMarkDone && (
                <Button
                  className="w-full"
                  onClick={() => changeStatus("done", "تم الرد ورفع المستندات الدالة.")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  تم التنفيذ
                </Button>
              )}
              {can.closeRecords(user?.role) && status === "done" && (
                <Button
                  className="w-full"
                  onClick={() => changeStatus("closed", "تم الاعتماد وإغلاق القيد نهائياً.")}
                >
                  <Lock className="h-4 w-4" />
                  اعتماد وإغلاق
                </Button>
              )}
              {status === "closed" && (
                <>
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-brand-500/10 py-3 text-sm font-bold text-brand-600 dark:text-brand-400">
                    <CheckCircle2 className="h-4 w-4" />
                    تم إغلاق القيد نهائياً
                  </div>
                  {can.manageRecords(user?.role) && (
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() =>
                        changeStatus("active", "إعادة فتح القيد للتنفيذ.")
                      }
                    >
                      إعادة فتح — قيد التنفيذ
                    </Button>
                  )}
                </>
              )}
              {can.sendUrgent(user?.role) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setUrgent(true)}
                >
                  <Mail className="h-4 w-4" />
                  إرسال استعجال
                </Button>
              )}
            </div>
          </Card>

          {mayAddAction && (
            <Card>
              <CardHeader title="إضافة إجراء جديد" />
              <div className="space-y-3 p-5 pt-0">
                <Field label="الإجراء المتخذ" required>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="اكتب الإجراء الذي تم اتخاذه..."
                  />
                </Field>
                <Field label="مرفقات الإجراء (PDF أو صورة — اختياري)">
                  <FileUpload
                    compact
                    attachments={actionAttachments}
                    onChange={setActionAttachments}
                  />
                </Field>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={addAction}
                  disabled={!note.trim()}
                >
                  <Send className="h-4 w-4" />
                  إضافة الإجراء
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="سجل المتابعة" />
            <div className="max-h-72 space-y-4 overflow-y-auto p-5 pt-0">
              {[...record.log].reverse().map((l) => (
                <div key={l.id} className="relative border-r-2 border-steel-100 pr-4 dark:border-steel-800">
                  <span className="absolute right-[-5px] top-1 h-2 w-2 rounded-full bg-brand-500" />
                  <p className="text-sm text-steel-700 dark:text-steel-200">{l.text}</p>
                  <p className="mt-0.5 text-xs text-steel-400">
                    {l.actor} • {formatDateTime(l.at)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <UrgentModal record={record} open={urgent} onClose={() => setUrgent(false)} />

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name} size="lg">
        {preview?.dataUrl ? (
          <iframe
            src={preview.dataUrl}
            title={preview.name}
            className="h-[70vh] w-full rounded-lg border border-steel-200 dark:border-steel-700"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-12 w-12 text-steel-300" />
            <p className="text-sm text-steel-400">
              مرفق توضيحي (PDF) — يتم استعراض الملفات المرفوعة فعلياً داخل النظام.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-steel-400">{label}</p>
      <p className="font-semibold text-steel-700 dark:text-steel-200">{value || "—"}</p>
    </div>
  );
}
