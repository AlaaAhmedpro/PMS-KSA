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
  | "super_admin"
  | "platform_admin"
  | "finance_admin"
  | "support_agent"
  | "readonly_admin"
  | "planning"
  | "branch_manager"
  | "employee"
  | "pr"
  | "executive";

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
  | "news"
  | "settings";

export interface User {
  id: string;
  name: string;
  email: string;
  role: AnyRoleId;
  branchId?: string;
  departmentId?: string;
  newsAdmin?: boolean;
  active?: boolean;
}

export interface Branch {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  category: Category;
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

export type NewsCategory = "sales" | "goals" | "congrats" | "alert";

export type NewsTarget =
  | { type: "all" }
  | { type: "branch"; branchId: string };

export interface NewsItem {
  id: string;
  text: string;
  category: NewsCategory;
  startDate: string;
  endDate: string;
  target: NewsTarget;
  createdBy: string;
  /** optional external link opened from the news ticker */
  link?: string;
}

export type TenantPlanId = string;
export type TenantStatus =
  | "pending"
  | "active"
  | "trial"
  | "suspended"
  | "expired"
  | "cancelled"
  | "archived";

export type OrgClientType = "small" | "enterprise" | "government";

export type OrgEnabledModules = {
  portfolio: boolean;
  program: boolean;
  initiative: boolean;
  strategicObjectives: boolean;
};

/** Legacy shape kept for migrations; prefer PlatformOrganization in platformDomain. */
export interface PlatformTenant {
  id: string;
  name: string;
  sector: string;
  planId: TenantPlanId;
  status: TenantStatus;
  seats: number;
  usedSeats: number;
  createdAt: string;
  organizationId?: string;
  orgAdminEmail?: string;
  orgAdminName?: string;
  clientType: OrgClientType;
  enabledModules: OrgEnabledModules;
  logoInitials?: string;
  industry?: string;
  country?: string;
  city?: string;
  customerKind?: "standard" | "enterprise" | "government";
  deploymentType?: "shared" | "dedicated";
  renewalAt?: string;
  trialEndsAt?: string;
  usage?: {
    users: number;
    projects: number;
    storageGb: number;
    apiRequests: number;
  };
}

/** Demo assignment record written by Platform Admin */
export interface OrgAdminAssignment {
  id: string;
  tenantId: string;
  organizationId: string;
  email: string;
  name: string;
  assignedAt: string;
}

export interface SubscriptionPlan {
  id: TenantPlanId;
  name: string;
  clientType: OrgClientType;
  description: string;
  workflow: string;
  priceMonthly: number;
  priceAnnual?: number;
  trialDays?: number;
  seatsIncluded: number;
  features: string[];
  enabledModules: OrgEnabledModules;
  active: boolean;
  limits?: {
    maxUsers: number;
    maxProjects: number;
    maxStorageGb: number;
    maxApiRequests: number;
  };
  entitlements?: Record<string, boolean>;
  billingCycleDefault?: "monthly" | "annual";
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
