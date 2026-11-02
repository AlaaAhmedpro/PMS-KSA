export type RecordKind = "project" | "task";

export type Status =
  | "new" // جديد
  | "active" // قيد التنفيذ
  | "done" // مكتمل
  | "closed" // مغلق
  | "overdue" // متأخر
  | "info"; // للمتابعة

/** معرّف تصنيف الإدارة / الشأن — قابل للتوسعة من إدارة القوائم */
export type Category = string;

export interface CategoryItem {
  id: string;
  name: string;
}

export type RoleId =
  | "org_admin"
  | "project_manager"
  | "member"
  | "external"
  | "executive"
  | "pr"
  /** @deprecated legacy aliases kept for migration */
  | "super_admin"
  | "planning"
  | "branch_manager"
  | "employee";

/** Built-in role ids are known; custom roles use arbitrary string ids. */
export type AnyRoleId = RoleId | string;

export interface Role {
  id: AnyRoleId;
  name: string;
  description: string;
  custom?: boolean;
}

export type PermissionKey =
  | "dashboard"
  | "manageRecords"
  | "execute"
  | "close"
  | "urgent"
  | "settings"
  | "managePeople"
  | "managePortfolio"
  | "manageProgram"
  | "manageInitiative"
  | "viewStrategic";

export interface User {
  id: string;
  name: string;
  email: string;
  role: AnyRoleId;
  organizationId?: string;
  branchId?: string;
  departmentId?: string;
  active?: boolean;
  mfaRequired?: boolean;
  scopedProjectIds?: string[];
  /** Demo-only; never treat as production secret store */
  password?: string;
}

export interface Branch {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  category: Category;
  /** إن وُجدت: الإدارة تتبع فرعاً محدداً. وإلا مشتركة على مستوى المؤسسة. */
  branchId?: string;
}

export interface Entity {
  id: string;
  name: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  /** data URL (for in-app preview in the demo) */
  dataUrl?: string;
  mimeType?: string;
  /** نص مستخرج من PDF أو OCR للبحث داخل المرفق */
  searchText?: string;
}

export interface LogEntry {
  id: string;
  at: string; // ISO
  actor: string;
  text: string;
}

/** إجراء يضيفه الموظف/المسؤول مع مرفقات اختيارية */
export interface ActionEntry {
  id: string;
  at: string;
  actorId?: string;
  actorName: string;
  /** مثل: عضو فريق / مدير فرع — أو مدير الإدارة */
  actorTitle: string;
  text: string;
  attachments: Attachment[];
}

export type NotificationType = "referral" | "deadline" | "overdue" | "escalation";

export interface AppNotification {
  id: string;
  /** المستخدم المستهدف بالإشعار */
  userId: string;
  recordId: string;
  kind: RecordKind;
  type: NotificationType;
  title: string;
  detail: string;
  createdAt: string;
  read: boolean;
}

export interface RecordItem {
  id: string;
  kind: RecordKind;
  /** رقم القيد الداخلي (auto) */
  regNumber: string;
  /** تاريخ الورود */
  arrivalDate: string;
  /** رقم المرجع الخارجي (الصادر من الجهة) */
  outNumber: string;
  /** تاريخ المرجع */
  letterDate: string;
  /** الجهة المعنية */
  entityId: string;
  /** الموضوع */
  subject: string;
  /** التصنيف */
  category: Category;
  /** المرفقات */
  attachments: Attachment[];
  /** الفرع / المنطقة */
  branchId: string;
  departmentId: string;
  /** المسؤول المعيّن */
  assignee: string;
  /** التاريخ المنتظر للتنفيذ (Deadline) */
  deadline: string;
  /** الحالة المحفوظة (overdue تُحسب آلياً) */
  status: Status;
  /** ملاحظات الإجراء المتخذ */
  notes: string;
  /** تاريخ التنفيذ الفعلي */
  executedDate?: string;
  priority?: "normal" | "high" | "critical";
  createdAt: string;
  log: LogEntry[];
  /** إجراءات الموظف/المسؤول (متعددة، كل واحد بمرفقاته) */
  actions?: ActionEntry[];
}

export type TenantPlanId = "starter" | "professional" | "enterprise";
export type TenantStatus = "active" | "trial" | "suspended";

export interface PlatformTenant {
  id: string;
  name: string;
  sector: string;
  planId: TenantPlanId;
  status: TenantStatus;
  seats: number;
  usedSeats: number;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: TenantPlanId;
  name: string;
  priceMonthly: number;
  seatsIncluded: number;
  features: string[];
  active: boolean;
}

export type DemoRequestStatus = "new" | "contacted" | "scheduled" | "closed";

export interface DemoRequest {
  id: string;
  orgName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
  status: DemoRequestStatus;
  createdAt: string;
}
