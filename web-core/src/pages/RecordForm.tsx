import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Save, FileSignature } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { Combobox } from "../components/ui/Combobox";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { FileUpload } from "../components/ui/FileUpload";
import { useData } from "../store/DataStore";
import { useAuth } from "../store/AuthContext";
import { useNotifications } from "../store/NotificationStore";
import { useCan } from "../store/RbacContext";
import { RECORD_KIND_LABELS, STATUS_META } from "../lib/constants";
import { todayISO } from "../lib/format";
import {
  buildAssignmentNotification,
  shouldNotifyAssignment,
} from "../lib/notifications";
import { getActorTitle, canUserAddAction } from "../lib/actionHelpers";
import type { ActionEntry, Attachment, Category, RecordKind, Status, User } from "../lib/types";

/** roles that can be assigned as responsible for execution */
const ASSIGNEE_ROLES = new Set(["employee", "branch_manager", "planning"]);

function usersForDepartment(
  users: User[],
  branchId: string,
  departmentId: string,
): User[] {
  return users.filter(
    (u) =>
      u.active !== false &&
      u.departmentId === departmentId &&
      u.branchId === branchId &&
      ASSIGNEE_ROLES.has(u.role),
  );
}

export function RecordForm({ kind }: { kind: RecordKind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    records,
    addRecord,
    updateRecord,
    entities,
    addEntity,
    branches,
    departments,
    categories,
  } = useData();
  const { users, user } = useAuth();
  const { addNotification } = useNotifications();
  const can = useCan();
  const existing = id ? records.find((r) => r.id === id) : undefined;
  const isEdit = !!existing;

  const base = kind === "project" ? "/projects" : "/tasks";
  const noun = RECORD_KIND_LABELS[kind];

  const nextRegNumber = useMemo(() => {
    const count = records.filter((r) => r.kind === kind).length + 1;
    const prefix = kind === "project" ? "مش" : "مه";
    return `${prefix}-2026/${String(count).padStart(4, "0")}`;
  }, [records, kind]);

  const [form, setForm] = useState({
    regNumber: existing?.regNumber ?? nextRegNumber,
    arrivalDate: existing?.arrivalDate ?? todayISO(),
    outNumber: existing?.outNumber ?? "",
    letterDate: existing?.letterDate ?? todayISO(),
    entityId: existing?.entityId ?? "",
    subject: existing?.subject ?? "",
    category: (existing?.category ?? "admin") as Category,
    branchId: existing?.branchId ?? "riyadh",
    departmentId: existing?.departmentId ?? "pm",
    assignee: existing?.assignee ?? "",
    deadline: existing?.deadline ?? "",
    status: (existing?.status ?? "new") as Status,
    notes: existing?.notes ?? "",
    executedDate: existing?.executedDate ?? "",
    attachments: (existing?.attachments ?? []) as Attachment[],
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const departmentUsers = useMemo(
    () => usersForDepartment(users, form.branchId, form.departmentId),
    [users, form.branchId, form.departmentId],
  );

  const onBranchChange = (branchId: string) => {
    setForm((f) => {
      const nextUsers = usersForDepartment(users, branchId, f.departmentId);
      const keepAssignee = nextUsers.some((u) => u.name === f.assignee);
      return {
        ...f,
        branchId,
        assignee: keepAssignee ? f.assignee : "",
      };
    });
  };

  const onDepartmentChange = (departmentId: string) => {
    setForm((f) => {
      const nextUsers = usersForDepartment(users, f.branchId, departmentId);
      const keepAssignee = nextUsers.some((u) => u.name === f.assignee);
      return {
        ...f,
        departmentId,
        assignee: keepAssignee ? f.assignee : "",
      };
    });
  };

  const onStatusChange = (status: Status) => {
    setForm((f) => ({
      ...f,
      status,
      // auto-record execution date when set to done
      executedDate:
        status === "done" && !f.executedDate ? todayISO() : f.executedDate,
    }));
  };

  const notifyAssigneeIfNeeded = (
    recordId: string,
    data: typeof form,
    previous?: { status: Status; assignee: string },
  ) => {
    if (
      !shouldNotifyAssignment(data.status, data.assignee, previous) ||
      !data.assignee
    )
      return;
    const payload = buildAssignmentNotification(users, {
      assigneeName: data.assignee,
      recordId,
      kind,
      subject: data.subject,
      regNumber: data.regNumber,
      referredBy: user?.name,
    });
    if (payload) addNotification(payload);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && existing) {
      updateRecord(existing.id, (r) => {
        const nextLog = [...r.log];
        const nextActions = [...(r.actions ?? [])];

        if (form.status !== r.status) {
          nextLog.push({
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            actor: user?.name || "مستخدم",
            text: `تغيير الحالة إلى «${STATUS_META[form.status].label}»`,
          });
        }

        const trimmedNotes = form.notes.trim();
        const notesChanged = trimmedNotes && trimmedNotes !== (r.notes || "");
        const lastAction = nextActions[nextActions.length - 1];
        const notDuplicate = !lastAction || lastAction.text !== trimmedNotes;
        const mayAddAction = canUserAddAction(
          user,
          { ...r, ...form },
          form.status,
          can.execute(user?.role),
        );

        if (notesChanged && notDuplicate && user && mayAddAction) {
          const at = new Date().toISOString();
          const entry: ActionEntry = {
            id: crypto.randomUUID(),
            at,
            actorId: user.id,
            actorName: user.name,
            actorTitle: getActorTitle(user, r),
            text: trimmedNotes,
            attachments: [],
          };
          nextActions.push(entry);
          nextLog.push({
            id: crypto.randomUUID(),
            at,
            actor: user.name,
            text: `إضافة إجراء: ${trimmedNotes}`,
          });
        }

        return {
          ...form,
          log: nextLog,
          actions: nextActions,
        };
      });
      notifyAssigneeIfNeeded(existing.id, form, {
        status: existing.status,
        assignee: existing.assignee,
      });
      navigate(`${base}/${existing.id}`);
    } else {
      const newId = crypto.randomUUID();
      addRecord({
        id: newId,
        kind,
        ...form,
        priority: "normal",
        createdAt: new Date().toISOString(),
        log: [
          {
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            actor: "مكتب إدارة المشاريع",
            text: `تم تسجيل ${noun} في النظام.`,
          },
        ],
      });
      notifyAssigneeIfNeeded(newId, form);
      navigate(`${base}/${newId}`);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? `تعديل ${noun}` : `تسجيل ${noun} جديدة`}
        subtitle={`أدخل بيانات ${noun} الأساسية ورفع المرفقات`}
        icon={<FileSignature className="h-6 w-6" />}
        actions={
          <Button variant="ghost" onClick={() => navigate(base)}>
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
        }
      />

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={`بيانات ${noun}`} />
            <div className="grid grid-cols-1 gap-4 p-5 pt-0 md:grid-cols-2">
              <Field label="رقم القيد الداخلي" hint="يُولّد تلقائياً">
                <Input value={form.regNumber} disabled />
              </Field>
              <Field label="تاريخ الورود" required>
                <Input
                  type="date"
                  value={form.arrivalDate}
                  onChange={(e) => set("arrivalDate", e.target.value)}
                />
              </Field>
              <Field label="رقم المرجع (الصادر من الجهة)">
                <Input
                  value={form.outNumber}
                  onChange={(e) => set("outNumber", e.target.value)}
                  placeholder="مثال: 2045"
                />
              </Field>
              <Field label="تاريخ المرجع">
                <Input
                  type="date"
                  value={form.letterDate}
                  onChange={(e) => set("letterDate", e.target.value)}
                />
              </Field>
              <Field label="الجهة المعنية" required className="md:col-span-2">
                <Combobox
                  options={entities}
                  value={form.entityId}
                  onChange={(v) => set("entityId", v)}
                  onCreate={(name) => addEntity(name)}
                  allowCreate
                  placeholder="اختر الجهة أو أضف جهة جديدة"
                  searchPlaceholder="بحث في الجهات أو إضافة جديدة..."
                />
              </Field>
              <Field label="الشأن / الموضوع" required className="md:col-span-2">
                <Textarea
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                  placeholder="نص مختصر يوضح محتوى الخطاب"
                />
              </Field>
              <Field label="التصنيف / الشأن">
                <SearchableSelect
                  value={form.category}
                  onChange={(v) => set("category", v)}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  searchPlaceholder="بحث في التصنيفات..."
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="المرفقات" subtitle="PDF أو صور — يُفهرَس النص تلقائياً للبحث في الأرشيف" />
            <div className="p-5 pt-0">
              <FileUpload
                attachments={form.attachments}
                onChange={(next) => set("attachments", next)}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="الإحالة والتوجيه" />
            <div className="space-y-4 p-5 pt-0">
              <Field label="الفرع / المنطقة" required>
                <SearchableSelect
                  value={form.branchId}
                  onChange={onBranchChange}
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  searchPlaceholder="بحث في الفروع..."
                />
              </Field>
              <Field label="الإدارة" required>
                <SearchableSelect
                  value={form.departmentId}
                  onChange={onDepartmentChange}
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                  searchPlaceholder="بحث في الأدارات / الفروع..."
                />
              </Field>
              <Field
                label="المسؤول المعيّن"
                required
                hint={
                  departmentUsers.length
                    ? "مرتبط بالفرع / المنطقة والأدارات / الفروع المختارة"
                    : "لا يوجد مسؤولون مسجلون — غيّر الأدارات / الفروع أو أضف مستخدمين"
                }
              >
                <SearchableSelect
                  value={form.assignee}
                  onChange={(v) => set("assignee", v)}
                  disabled={departmentUsers.length === 0}
                  placeholder="— اختر المسؤول —"
                  searchPlaceholder="بحث في المسؤولين..."
                  options={[
                    ...departmentUsers.map((u) => ({
                      value: u.name,
                      label: u.name,
                    })),
                    ...(form.assignee &&
                    !departmentUsers.some((u) => u.name === form.assignee)
                      ? [{ value: form.assignee, label: form.assignee }]
                      : []),
                  ]}
                />
              </Field>
              <Field label="التاريخ المنتظر للتنفيذ (Deadline)" required>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => set("deadline", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="الحالة والإجراء" />
            <div className="space-y-4 p-5 pt-0">
              <Field label={`حالة ${noun}`}>
                <SearchableSelect
                  value={form.status}
                  onChange={(v) => onStatusChange(v as Status)}
                  options={(["new", "active", "done", "closed", "info"] as Status[]).map(
                    (s) => ({ value: s, label: STATUS_META[s].label }),
                  )}
                  searchPlaceholder="بحث في الحالات..."
                />
              </Field>
              <Field
                label="تاريخ التنفيذ الفعلي"
                hint='يُسجل تلقائياً عند تحويل الحالة إلى "تم التنفيذ"'
              >
                <Input
                  type="date"
                  value={form.executedDate}
                  onChange={(e) => set("executedDate", e.target.value)}
                />
              </Field>
              <Field label="ملاحظات الإجراء المتخذ">
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="الإجراء الذي تم اتخاذه"
                />
              </Field>
            </div>
          </Card>

          <Button type="submit" size="lg" className="w-full">
            <Save className="h-5 w-5" />
            {isEdit ? "حفظ التعديلات" : "حفظ وتسجيل"}
          </Button>
        </div>
      </form>
    </div>
  );
}
