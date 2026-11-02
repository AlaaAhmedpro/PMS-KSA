import { Link, useLocation } from "react-router-dom";
import {
  Boxes,
  Flag,
  FolderKanban,
  History,
  Paperclip,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "../../lib/cn";
import type { Initiative, Portfolio, Program, Project } from "../../models/domain";
import { PROJECT_PLACEMENT_LABELS } from "../../lib/orgModules";
import { projectRelationships } from "../../lib/hierarchyLinks";

type TabId =
  | "overview"
  | "stages"
  | "team"
  | "expenses"
  | "materials"
  | "documents"
  | "activity";

const TABS: {
  id: TabId;
  label: string;
  icon: typeof FolderKanban;
  hash: string;
}[] = [
  { id: "overview", label: "نظرة عامة", icon: FolderKanban, hash: "overview" },
  { id: "stages", label: "المراحل", icon: Flag, hash: "stages" },
  { id: "team", label: "الفريق", icon: Users, hash: "team" },
  { id: "expenses", label: "المصاريف", icon: Wallet, hash: "expenses" },
  { id: "materials", label: "الأصناف والمواد", icon: Boxes, hash: "materials" },
  { id: "documents", label: "المستندات", icon: Paperclip, hash: "documents" },
  { id: "activity", label: "سجل النشاطات", icon: History, hash: "activity" },
];

export function ProjectContextualNav({
  project,
  portfolios,
  programs,
  initiatives,
}: {
  project: Project;
  portfolios: Portfolio[];
  programs: Program[];
  initiatives: Initiative[];
}) {
  const location = useLocation();
  const rawHash = (location.hash || "#overview").replace("#", "");
  const hash = (rawHash === "work" ? "stages" : rawHash) as TabId;
  const active = TABS.some((t) => t.id === hash) ? hash : "overview";
  const { placement } = projectRelationships(
    project,
    portfolios,
    programs,
    initiatives,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-steel-100 px-2 py-1 text-[10px] font-bold text-steel-600 dark:bg-steel-800 dark:text-steel-300">
          {PROJECT_PLACEMENT_LABELS[placement]}
        </span>
        {placement === "fully_independent" ? (
          <span className="text-[11px] text-steel-400">
            مشروع مستقل — بلا محفظة أو برنامج
          </span>
        ) : null}
      </div>

      <nav
        className="flex flex-wrap gap-1 rounded-md border border-steel-200 bg-white p-1 dark:border-steel-700 dark:bg-steel-900"
        aria-label="تنقل المشروع"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isOn = active === tab.id;
          return (
            <a
              key={tab.id}
              href={`#${tab.hash}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-bold transition-colors duration-150",
                isOn
                  ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "text-steel-500 hover:bg-steel-50 dark:hover:bg-steel-800",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </a>
          );
        })}
        <Link
          to="/projects"
          className="ms-auto inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-bold text-steel-400 hover:bg-steel-50 dark:hover:bg-steel-800"
        >
          <Settings2 className="h-3.5 w-3.5" />
          كل المشاريع
        </Link>
      </nav>
    </div>
  );
}
