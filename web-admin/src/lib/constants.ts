import type {
  AnyRoleId,
  Branch,
  CategoryItem,
  Department,
  NewsCategory,
  PermissionKey,
  Role,
  Status,
} from "./types";

/** بيانات أولية — تُحمَّل في DataStore ويمكن تعديلها من إدارة القوائم */
export const SEED_BRANCHES: Branch[] = [
  { id: "riyadh", name: "الرياض" },
  { id: "jeddah", name: "جدة" },
  { id: "dammam", name: "الدمام" },
  { id: "madinah", name: "المدينة المنورة" },
  { id: "abha", name: "أبها" },
];

export const SEED_DEPARTMENTS: Department[] = [
  { id: "pm", name: "إدارة المشاريع", category: "admin" },
  { id: "planning", name: "التخطيط", category: "admin" },
  { id: "finance", name: "المالية", category: "financial" },
  { id: "it", name: "تقنية المعلومات", category: "tech" },
  { id: "hr", name: "الموارد البشرية", category: "admin" },
  { id: "quality", name: "الجودة", category: "tech" },
  { id: "procurement", name: "المشتريات", category: "financial" },
  { id: "legal", name: "الشؤون القانونية", category: "consulting" },
  { id: "operations", name: "العمليات", category: "infrastructure" },
  { id: "pr", name: "العلاقات العامة", category: "admin" },
];

/** @deprecated استخدم useData().branches */
export const BRANCHES = SEED_BRANCHES;
/** @deprecated استخدم useData().departments */
export const DEPARTMENTS = SEED_DEPARTMENTS;

export const SEED_CATEGORIES: CategoryItem[] = [
  { id: "infrastructure", name: "بنية تحتية" },
  { id: "housing", name: "إسكان" },
  { id: "tech", name: "تقنية" },
  { id: "financial", name: "مالي" },
  { id: "admin", name: "إداري" },
  { id: "consulting", name: "استشاري" },
];

/** @deprecated استخدم useData().categories */
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SEED_CATEGORIES.map((c) => [c.id, c.name]),
);

export const ROLES: Role[] = [
  {
    id: "super_admin",
    name: "مدير النظام",
    description: "صلاحيات كاملة على منظومة المنشأة",
  },
  {
    id: "platform_admin",
    name: "مسؤول المنصة",
    description: "إدارة المستأجرين والاشتراكات وطلبات العرض التجريبي",
  },
  {
    id: "planning",
    name: "مكتب إدارة المشاريع (PMO)",
    description: "تسجيل المشاريع والمهام والإحالة والإغلاق وإدارة الأخبار",
  },
  {
    id: "branch_manager",
    name: "مدير فرع / منطقة",
    description: "متابعة مشاريع ومهام الفرع ومرؤوسيه",
  },
  {
    id: "employee",
    name: "عضو فريق",
    description: "المشاريع والمهام المحالة إليه وتحديث الحالة ورفع المستندات",
  },
  {
    id: "pr",
    name: "التواصل المؤسسي",
    description: "إدارة شريط الأخبار فقط",
  },
  {
    id: "executive",
    name: "الإدارة العليا",
    description: "لوحة المؤشرات والمتابعة وإرسال الاستعجالات",
  },
];

export const PERMISSION_DEFS: { key: PermissionKey; label: string }[] = [
  { key: "dashboard", label: "عرض لوحة المؤشرات" },
  { key: "manageRecords", label: "تسجيل وإحالة المشاريع والمهام" },
  { key: "execute", label: "تغيير الحالة ورفع المستندات" },
  { key: "close", label: "الاعتماد والإغلاق النهائي" },
  { key: "urgent", label: "إرسال الاستعجالات" },
  { key: "news", label: "إدارة شريط الأخبار (News_Admin)" },
  { key: "settings", label: "الصلاحيات والتقارير والأرشيف" },
];

/** Default permission matrix: roleId -> granted permission keys */
export const DEFAULT_MATRIX: Record<AnyRoleId, PermissionKey[]> = {
  super_admin: ["dashboard", "manageRecords", "execute", "close", "urgent", "news", "settings"],
  platform_admin: ["dashboard", "settings"],
  planning: ["dashboard", "manageRecords", "execute", "close", "urgent", "news", "settings"],
  branch_manager: ["dashboard", "manageRecords", "execute", "urgent"],
  employee: ["dashboard", "execute"],
  pr: ["news"],
  executive: ["dashboard", "urgent"],
};

export interface StatusMeta {
  label: string;
  // tailwind utility groups
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

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  sales: "إنجازات",
  goals: "أهداف",
  congrats: "تهنئة",
  alert: "تنبيه",
};

export const NEWS_CATEGORY_STYLE: Record<NewsCategory, string> = {
  sales: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  goals: "bg-brand-500/15 text-brand-300 border-brand-500/30",
  congrats: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  alert: "bg-red-500/15 text-red-300 border-red-500/30",
};

export const RECORD_KIND_LABELS: Record<import("./types").RecordKind, string> = {
  project: "مشروع",
  task: "مهمة",
};

export const RECORD_KIND_LABELS_PLURAL: Record<import("./types").RecordKind, string> = {
  project: "مشاريع",
  task: "مهام",
};
