import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  ShieldCheck,
  FileBarChart,
  Archive,
  List,
  Briefcase,
  Layers,
  Users,
  GitBranch,
  Flag,
  Compass,
  Network,
  Settings2,
} from "lucide-react";
import type { NavSectionDef } from "./types";

/** Global module navigation only — no entity instance trees. */
export const SIDEBAR_SECTIONS: NavSectionDef[] = [
  {
    id: "workspace",
    label: "مساحة العمل",
    items: [
      { id: "dashboard", to: "/", label: "لوحة المؤشرات", icon: LayoutDashboard },
      {
        id: "strategy",
        to: "/strategy",
        label: "النظرة الاستراتيجية",
        hint: "تسلسل · علاقات · جدول",
        icon: Network,
      },
      {
        id: "explorer",
        to: "/structure",
        label: "مستكشف العمل",
        hint: "الفروع والإدارات",
        icon: GitBranch,
      },
    ],
  },
  {
    id: "strategic",
    label: "التخطيط الاستراتيجي",
    caption: "ارتباطات اختيارية · ليست شجرة إلزامية",
    items: [
      {
        id: "portfolios",
        to: "/portfolios",
        label: "المحافظ",
        hint: "لوحة · إدارة",
        icon: Briefcase,
      },
      { id: "initiatives", to: "/initiatives", label: "المبادرات", icon: Compass },
      { id: "programs", to: "/programs", label: "البرامج", icon: Layers },
      { id: "objectives", to: "/objectives", label: "الأهداف الاستراتيجية", icon: Flag },
    ],
  },
  {
    id: "execution",
    label: "التنفيذ",
    caption: "المشروع وحدة العمل — يمكن أن يكون مستقلاً",
    items: [
      {
        id: "projects",
        to: "/projects",
        label: "المشاريع",
        hint: "تحت برنامج أو مستقلة",
        icon: FolderKanban,
        matchPrefix: true,
      },
      { id: "tasks", to: "/tasks", label: "المهام والمعالم", icon: ListTodo },
    ],
  },
  {
    id: "resources",
    label: "الموارد",
    items: [
      { id: "people", to: "/people", label: "الأعضاء والدعوات", icon: Users },
      { id: "lookups", to: "/lookups", label: "إدارة القوائم", icon: List },
    ],
  },
  {
    id: "insights",
    label: "الرؤى",
    items: [
      { id: "reports", to: "/reports", label: "التقارير", icon: FileBarChart },
      { id: "archive", to: "/archive", label: "الأرشيف الإلكتروني", icon: Archive },
    ],
  },
  {
    id: "admin",
    label: "الإدارة",
    items: [
      { id: "permissions", to: "/permissions", label: "الصلاحيات", icon: ShieldCheck },
      {
        id: "portfolio-settings",
        to: "/settings/portfolio",
        label: "حوكمة المحافظ",
        hint: "ملفات وسياسات ومسارات",
        icon: Settings2,
      },
    ],
  },
];
