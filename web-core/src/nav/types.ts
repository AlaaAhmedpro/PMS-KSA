import type { LucideIcon } from "lucide-react";

export type NavSectionId =
  | "workspace"
  | "strategic"
  | "execution"
  | "resources"
  | "insights"
  | "admin";

export interface NavItemDef {
  id: string;
  to: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  /** Match project detail under /projects/:id */
  matchPrefix?: boolean;
}

export interface NavSectionDef {
  id: NavSectionId;
  label: string;
  caption?: string;
  items: NavItemDef[];
}
