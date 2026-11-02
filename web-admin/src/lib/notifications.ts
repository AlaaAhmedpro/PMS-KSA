import type {
  AppNotification,
  RecordKind,
  Status,
  User,
} from "./types";

export function findUserByAssigneeName(
  users: User[],
  assigneeName: string,
): User | undefined {
  return users.find((u) => u.name === assigneeName.trim());
}

/** إرسال إشعار إحالة عند قيد التنفيذ مع مسؤول محدد */
export function shouldNotifyAssignment(
  status: Status,
  assignee: string,
  previous?: { status: Status; assignee: string },
): boolean {
  if (status !== "active" || !assignee.trim()) return false;
  if (!previous) return true;
  return (
    previous.status !== "active" || previous.assignee.trim() !== assignee.trim()
  );
}

export function assignmentNotificationContent(params: {
  subject: string;
  regNumber: string;
  kind: RecordKind;
  referredBy?: string;
}) {
  const noun = params.kind === "task" ? "مهمة" : "مشروع";
  return {
    title: `إحالة ${noun} — قيد التنفيذ`,
    detail: `تم إحالة ${noun} "${params.subject}" (${params.regNumber}) إليك${
      params.referredBy ? ` بواسطة ${params.referredBy}` : ""
    }.`,
  };
}

export type NewAppNotification = Omit<
  AppNotification,
  "id" | "createdAt" | "read"
>;

export function buildAssignmentNotification(
  users: User[],
  params: {
    assigneeName: string;
    recordId: string;
    kind: RecordKind;
    subject: string;
    regNumber: string;
    referredBy?: string;
  },
): NewAppNotification | null {
  const target = findUserByAssigneeName(users, params.assigneeName);
  if (!target) return null;
  const { title, detail } = assignmentNotificationContent(params);
  return {
    userId: target.id,
    recordId: params.recordId,
    kind: params.kind,
    type: "referral",
    title,
    detail,
  };
}

export function urgentNotificationContent(params: {
  subject: string;
  regNumber: string;
  kind: RecordKind;
  message: string;
  sentBy?: string;
}) {
  const noun = params.kind === "task" ? "مهمة" : "مشروع";
  return {
    title: `استعجال — ${noun} ${params.regNumber}`,
    detail: `${params.sentBy ? `${params.sentBy}: ` : ""}${params.message} (${params.subject})`,
  };
}

export function buildUrgentNotification(
  users: User[],
  params: {
    assigneeName: string;
    recordId: string;
    kind: RecordKind;
    subject: string;
    regNumber: string;
    message: string;
    sentBy?: string;
  },
): NewAppNotification | null {
  const target = findUserByAssigneeName(users, params.assigneeName);
  if (!target) return null;
  const { title, detail } = urgentNotificationContent(params);
  return {
    userId: target.id,
    recordId: params.recordId,
    kind: params.kind,
    type: "escalation",
    title,
    detail,
  };
}

export interface DemoSentEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  recordId: string;
  recordKind: RecordKind;
  sentAt: string;
  sentBy?: string;
}

const LS_SENT_MAIL = "pms_sent_mail_v1";

function loadMailLog(): DemoSentEmail[] {
  try {
    const raw = localStorage.getItem(LS_SENT_MAIL);
    if (!raw) return [];
    return JSON.parse(raw) as DemoSentEmail[];
  } catch {
    return [];
  }
}

/** محاكاة إرسال بريد في النسخة التجريبية */
export function sendDemoUrgentEmail(params: {
  to: string;
  subject: string;
  body: string;
  recordId: string;
  recordKind: RecordKind;
  sentBy?: string;
}): DemoSentEmail {
  const entry: DemoSentEmail = {
    id: crypto.randomUUID(),
    to: params.to,
    subject: params.subject,
    body: params.body,
    recordId: params.recordId,
    recordKind: params.recordKind,
    sentAt: new Date().toISOString(),
    sentBy: params.sentBy,
  };
  localStorage.setItem(LS_SENT_MAIL, JSON.stringify([entry, ...loadMailLog()]));
  return entry;
}

export function assigneeEmail(users: User[], assigneeName: string): string {
  return findUserByAssigneeName(users, assigneeName)?.email ?? "";
}
