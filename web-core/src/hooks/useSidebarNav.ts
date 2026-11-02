import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { SIDEBAR_SECTIONS } from "../nav/sidebarConfig";
import type { NavItemDef, NavSectionDef, NavSectionId } from "../nav/types";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";
import { useOrgModules } from "./useOrgModules";

const LS_EXPANDED = "pms_core_nav_expanded_v1";

function loadExpanded(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_EXPANDED);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function isItemActive(item: NavItemDef, pathname: string, search: string): boolean {
  if (item.to.includes("?")) {
    const [p, q] = item.to.split("?");
    return pathname === p && search.includes(q);
  }
  if (item.id === "projects") {
    return (
      (pathname === "/projects" && !search.includes("scope=")) ||
      pathname.startsWith("/projects/")
    );
  }
  if (item.id === "standalone") {
    return pathname === "/projects" && search.includes("scope=standalone");
  }
  if (item.id === "dashboard" || item.to === "/") {
    return pathname === "/";
  }
  if (item.matchPrefix) {
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  }
  return pathname === item.to;
}

function sectionContainsActive(
  section: NavSectionDef,
  pathname: string,
  search: string,
  visibleIds: Set<string>,
): boolean {
  return section.items.some(
    (item) => visibleIds.has(item.id) && isItemActive(item, pathname, search),
  );
}

export function useSidebarNav() {
  const location = useLocation();
  const { user } = useAuth();
  const can = useCan();
  const role = user?.role;
  const {
    modules,
    clientMeta,
    canAccessPortfolio,
    canAccessProgram,
    canAccessInitiative,
    showStrategicNav,
    showProjectsNav,
  } = useOrgModules();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    workspace: true,
    strategic: true,
    execution: true,
    resources: true,
    insights: true,
    admin: true,
    ...loadExpanded(),
  }));

  const itemVisible = useMemo(() => {
    const map = new Map<string, boolean>();
    map.set("dashboard", true);
    map.set(
      "strategy",
      showStrategicNav ||
        modules.portfolio ||
        modules.program ||
        modules.initiative ||
        showProjectsNav,
    );
    map.set("explorer", showStrategicNav || modules.portfolio || modules.program);
    map.set("portfolios", modules.portfolio && canAccessPortfolio("view"));
    map.set("programs", modules.program && canAccessProgram("view"));
    map.set(
      "objectives",
      modules.strategicObjectives && canAccessInitiative("view"),
    );
    map.set("initiatives", modules.initiative && canAccessInitiative("view"));
    map.set("projects", showProjectsNav);
    map.set("tasks", showProjectsNav);
    map.set(
      "people",
      can.managePeople(role) && role !== "vendor_admin",
    );
    map.set(
      "vendors",
      role === "org_admin" || role === "vendor_admin",
    );
    map.set("lookups", can.viewSettings(role));
    map.set("reports", can.viewSettings(role));
    map.set("archive", can.viewSettings(role));
    map.set("permissions", can.viewSettings(role));
    map.set(
      "portfolio-settings",
      can.viewSettings(role) &&
        (modules.portfolio || canAccessPortfolio("view")),
    );
    return map;
  }, [
    modules,
    canAccessPortfolio,
    canAccessProgram,
    canAccessInitiative,
    showStrategicNav,
    showProjectsNav,
    can,
    role,
  ]);

  const sections = useMemo(() => {
    return SIDEBAR_SECTIONS.map((section) => {
      const items = section.items.filter((i) => itemVisible.get(i.id));
      if (section.id === "strategic" && !showStrategicNav && items.length === 0) {
        return { ...section, items: [] };
      }
      return { ...section, items };
    }).filter((s) => s.items.length > 0);
  }, [itemVisible, showStrategicNav]);

  const visibleIds = useMemo(
    () => new Set(sections.flatMap((s) => s.items.map((i) => i.id))),
    [sections],
  );

  // Auto-expand section that contains the active route
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const section of SIDEBAR_SECTIONS) {
        if (
          sectionContainsActive(
            section,
            location.pathname,
            location.search,
            visibleIds,
          ) &&
          !next[section.id]
        ) {
          next[section.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [location.pathname, location.search, visibleIds]);

  useEffect(() => {
    localStorage.setItem(LS_EXPANDED, JSON.stringify(expanded));
  }, [expanded]);

  const toggleSection = (id: NavSectionId) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (item: NavItemDef) =>
    isItemActive(item, location.pathname, location.search);

  return {
    sections,
    expanded,
    toggleSection,
    isActive,
    clientMeta,
  };
}
