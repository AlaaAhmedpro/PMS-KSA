import type {
  AnyRoleId,
  Branch,
  CategoryItem,
  Department,
  PermissionKey,
  Role,
  Status,
} from "./types";

export const SEED_BRANCHES: Branch[] = [
  { id: "riyadh", name: "الرياض" },
  { id: "jeddah", name: "جدة" },
  { id: "dammam", name: "الدمام" },
  { id: "madinah", name: "المدينة المنورة" },
  { id: "abha", name: "أبها" },
];

export const SEED_DEPARTMENTS: Department[] = [
  { id: "pm", name: "إدارة المشاريع", category: "admin", branchId: "riyadh" },
  { id: "planning", name: "التخطيط", category: "admin", branchId: "riyadh" },
  { id: "finance", name: "المالية", category: "financial" },
  { id: "it", name: "تقنية المعلومات", category: "tech", branchId: "riyadh" },
  { id: "hr", name: "الموارد البشرية", category: "admin" },
  { id: "quality", name: "الجودة", category: "tech", branchId: "dammam" },
  { id: "procurement", name: "المشتريات", category: "financial", branchId: "riyadh" },
  { id: "legal", name: "الشؤون القانونية", category: "consulting" },
  { id: "operations", name: "العمليات", category: "infrastructure", branchId: "jeddah" },
  { id: "pr", name: "العلاقات العامة", category: "admin", branchId: "riyadh" },
  { id: "ops-jeddah", name: "تشغيل المشاريع — جدة", category: "infrastructure", branchId: "jeddah" },
  { id: "it-jeddah", name: "تقنية المعلومات — جدة", category: "tech", branchId: "jeddah" },
  { id: "pm-dammam", name: "إدارة المشاريع — الدمام", category: "admin", branchId: "dammam" },
  { id: "ops-madinah", name: "العمليات الميدانية — المدينة", category: "infrastructure", branchId: "madinah" },
  { id: "pm-abha", name: "إدارة المشاريع — أبها", category: "admin", branchId: "abha" },
];

export const BRANCHES = SEED_BRANCHES;
export const DEPARTMENTS = SEED_DEPARTMENTS;

export const SEED_CATEGORIES: CategoryItem[] = [
  { id: "infrastructure", name: "بنية تحتية" },
  { id: "housing", name: "إسكان" },
  { id: "tech", name: "تقنية" },
  { id: "financial", name: "مالي" },
  { id: "admin", name: "إداري" },
  { id: "consulting", name: "استشاري" },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SEED_CATEGORIES.map((c) => [c.id, c.name]),
);

export const ROLES: Role[] = [
  {
    id: "org_admin",
    name: "مسؤول المؤسسة",
    description: "إدارة الموظفين والأدوار وإعدادات المنشأة",
  },
  {
    id: "project_manager",
    name: "مدير مشروع",
    description: "دعوة أعضاء المشروع وتحديد صلاحيات المشروع",
  },
  {
    id: "member",
    name: "عضو فريق",
    description: "تنفيذ المهام ضمن النطاق المسموح",
  },
  {
    id: "external",
    name: "مستخدم خارجي",
    description: "وصول محدود لمشاريع مدعوة إليها",
  },
  {
    id: "executive",
    name: "الإدارة العليا",
    description: "لوحة المؤشرات والاستعجالات",
  },
  {
    id: "pr",
    name: "التواصل المؤسسي",
    description: "إدارة شريط الأخبار",
  },
  {
    id: "vendor_admin",
    name: "مسؤول المورد",
    description: "إدارة موظفي شركة المورد ضمن المشاريع المسموحة",
  },
  {
    id: "vendor_member",
    name: "موظف المورد",
    description: "تنفيذ المهام على مشاريع المورد فقط",
  },
];

export const PERMISSION_DEFS: { key: PermissionKey; label: string }[] = [
  { key: "dashboard", label: "عرض لوحة المؤشرات" },
  { key: "manageRecords", label: "إدارة المشاريع والمهام" },
  { key: "execute", label: "تنفيذ المهام وتحديث الحالة" },
  { key: "close", label: "اعتماد وإغلاق المشاريع" },
  { key: "urgent", label: "إرسال الاستعجالات" },
  { key: "settings", label: "الصلاحيات والتقارير والأرشيف" },
  { key: "managePeople", label: "دعوة الموظفين وإدارة العضويات" },
  { key: "managePortfolio", label: "إدارة المحافظ" },
  { key: "manageProgram", label: "إدارة البرامج" },
  { key: "manageInitiative", label: "إدارة المبادرات والأهداف" },
  { key: "viewStrategic", label: "عرض الطبقات الاستراتيجية" },
];

export const DEFAULT_MATRIX: Record<AnyRoleId, PermissionKey[]> = {
  org_admin: [
    "dashboard",
    "manageRecords",
    "execute",
    "close",
    "urgent",
    "settings",
    "managePeople",
    "managePortfolio",
    "manageProgram",
    "manageInitiative",
    "viewStrategic",
  ],
  project_manager: [
    "dashboard",
    "manageRecords",
    "execute",
    "urgent",
    "managePeople",
  ],
  member: ["dashboard", "execute"],
  external: ["dashboard", "execute"],
  executive: ["dashboard", "urgent", "viewStrategic"],
  pr: ["dashboard"],
  vendor_admin: ["dashboard", "execute", "managePeople"],
  vendor_member: ["dashboard", "execute"],
};

export interface StatusMeta {
  label: string;
  dot: string;
  badge: string;
  text: string;
}

export const STATUS_META: Record<Status, StatusMeta> = {
  new: {
    label: "جديد",
    dot: "bg-steel-400",
    badge:
      "bg-steel-100 text-steel-700 dark:bg-steel-800 dark:text-steel-200 border border-steel-200 dark:border-steel-700",
    text: "text-steel-600 dark:text-steel-300",
  },
  active: {
    label: "قيد التنفيذ",
    dot: "bg-amber-500",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  done: {
    label: "مكتمل",
    dot: "bg-brand-500",
    badge:
      "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30",
    text: "text-brand-600 dark:text-brand-400",
  },
  closed: {
    label: "مغلق",
    dot: "bg-steel-600",
    badge:
      "bg-steel-200 text-steel-800 dark:bg-steel-700 dark:text-steel-100 border border-steel-300 dark:border-steel-600",
    text: "text-steel-700 dark:text-steel-200",
  },
  overdue: {
    label: "متأخر",
    dot: "bg-red-500",
    badge:
      "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 border border-red-300 dark:border-red-500/40",
    text: "text-red-600 dark:text-red-400",
  },
  info: {
    label: "للمتابعة",
    dot: "bg-sky-400",
    badge:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
  },
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  planned: "مخطط",
  active: "نشط",
  on_hold: "موقوف مؤقتاً",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "للتنفيذ",
  in_progress: "قيد التنفيذ",
  blocked: "معلّق",
  done: "منجز",
  cancelled: "ملغى",
};

export const STAGE_STATUS_LABELS: Record<string, string> = {
  planned: "مخططة",
  active: "جارية",
  completed: "مكتملة",
  on_hold: "موقوفة",
  cancelled: "ملغاة",
};

export const PROJECT_ACTIVITY_KIND_LABELS: Record<string, string> = {
  note: "ملاحظة",
  status: "حالة",
  stage: "مرحلة",
  task: "مهمة",
  team: "فريق",
  expense: "مصروف",
  document: "مستند",
  material: "مادة",
  comment: "تعليق",
};

export const PROJECT_MATERIAL_STATUS_LABELS: Record<string, string> = {
  requested: "مطلوب",
  ordered: "تم الطلب",
  received: "مستلم",
  consumed: "مستهلك",
  cancelled: "ملغى",
};

export const RECORD_KIND_LABELS: Record<"project" | "task", string> = {
  project: "مشروع",
  task: "مهمة",
};

export const RECORD_KIND_LABELS_PLURAL: Record<"project" | "task", string> = {
  project: "المشاريع",
  task: "المهام",
};
