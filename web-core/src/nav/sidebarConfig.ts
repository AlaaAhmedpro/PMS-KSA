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
  Building2,
  GitBranch,
  Flag,
  Compass,
  Network,
  Settings2,
  CreditCard,
} from "lucide-react";
import type { NavSectionDef } from "./types";

/** Global module navigation only — no entity instance trees. Labels via i18n keys. */
export const SIDEBAR_SECTIONS: NavSectionDef[] = [
  {
    id: "workspace",
    labelKey: "nav.section.workspace",
    items: [
      { id: "dashboard", to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
      {
        id: "strategy",
        to: "/strategy",
        labelKey: "nav.strategy",
        hintKey: "nav.strategy.hint",
        icon: Network,
      },
      {
        id: "explorer",
        to: "/structure",
        labelKey: "nav.explorer",
        hintKey: "nav.explorer.hint",
        icon: GitBranch,
      },
    ],
  },
  {
    id: "strategic",
    labelKey: "nav.section.strategic",
    captionKey: "nav.section.strategic.caption",
    items: [
      { id: "objectives", to: "/objectives", labelKey: "nav.objectives", icon: Flag },
      {
        id: "portfolios",
        to: "/portfolios",
        labelKey: "nav.portfolios",
        hintKey: "nav.portfolios.hint",
        icon: Briefcase,
      },
      { id: "programs", to: "/programs", labelKey: "nav.programs", icon: Layers },
      { id: "initiatives", to: "/initiatives", labelKey: "nav.initiatives", icon: Compass },
    ],
  },
  {
    id: "execution",
    labelKey: "nav.section.execution",
    captionKey: "nav.section.execution.caption",
    items: [
      {
        id: "projects",
        to: "/projects",
        labelKey: "nav.projects",
        hintKey: "nav.projects.hint",
        icon: FolderKanban,
        matchPrefix: true,
      },
      { id: "tasks", to: "/tasks", labelKey: "nav.tasks", icon: ListTodo },
    ],
  },
  {
    id: "resources",
    labelKey: "nav.section.resources",
    items: [
      { id: "people", to: "/people", labelKey: "nav.people", icon: Users },
      {
        id: "vendors",
        to: "/vendors",
        labelKey: "nav.vendors",
        icon: Building2,
        matchPrefix: true,
      },
    ],
  },
  {
    id: "insights",
    labelKey: "nav.section.insights",
    items: [
      { id: "reports", to: "/reports", labelKey: "nav.reports", icon: FileBarChart },
      { id: "archive", to: "/archive", labelKey: "nav.archive", icon: Archive },
    ],
  },
  {
    id: "admin",
    labelKey: "nav.section.admin",
    items: [
      { id: "permissions", to: "/permissions", labelKey: "nav.permissions", icon: ShieldCheck },
      { id: "lookups", to: "/lookups", labelKey: "nav.lookups", icon: List },
      {
        id: "portfolio-settings",
        to: "/settings/portfolio",
        labelKey: "nav.portfolioSettings",
        hintKey: "nav.portfolioSettings.hint",
        icon: Settings2,
      },
      {
        id: "billing-settings",
        to: "/settings/billing",
        labelKey: "nav.billing",
        hintKey: "nav.billing.hint",
        icon: CreditCard,
      },
    ],
  },
];
