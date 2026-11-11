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
  /** i18n key for the item label */
  labelKey: string;
  /** i18n key for the optional hint under the label */
  hintKey?: string;
  icon: LucideIcon;
  /** Match project detail under /projects/:id */
  matchPrefix?: boolean;
}

export interface NavSectionDef {
  id: NavSectionId;
  /** i18n key for the section label */
  labelKey: string;
  /** i18n key for the optional section caption */
  captionKey?: string;
  items: NavItemDef[];
}
