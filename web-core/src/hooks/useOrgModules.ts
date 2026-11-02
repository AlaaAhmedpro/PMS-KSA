import { useMemo } from "react";
import {
  ALL_MODULES_OFF,
  CLIENT_TYPE_META,
  inferClientType,
  normalizeOrgModules,
  type OrgModuleKey,
} from "../lib/orgModules";
import { useAuth } from "../store/AuthContext";
import { useCan } from "../store/RbacContext";

export type StrategicAction = "view" | "manage";

export function useOrgModules() {
  const { organization, user } = useAuth();
  const can = useCan();
  const role = user?.role;

  const modules = useMemo(
    () =>
      normalizeOrgModules(organization?.enabledModules ?? ALL_MODULES_OFF),
    [organization?.enabledModules],
  );

  const clientType = useMemo(
    () => inferClientType(modules, organization?.clientType),
    [modules, organization?.clientType],
  );

  const clientMeta = CLIENT_TYPE_META[clientType];

  const isEnabled = (key: OrgModuleKey) => modules[key];

  const canViewStrategic =
    can.viewStrategic(role) ||
    can.managePortfolio(role) ||
    can.manageProgram(role) ||
    can.manageInitiative(role);

  const canAccessPortfolio = (action: StrategicAction = "view") => {
    if (!modules.portfolio) return false;
    if (action === "manage") return can.managePortfolio(role);
    return canViewStrategic || can.managePortfolio(role);
  };

  const canAccessProgram = (action: StrategicAction = "view") => {
    if (!modules.program) return false;
    if (action === "manage") return can.manageProgram(role);
    return canViewStrategic || can.manageProgram(role);
  };

  const canAccessInitiative = (action: StrategicAction = "view") => {
    if (!modules.initiative && !modules.strategicObjectives) return false;
    if (action === "manage") return can.manageInitiative(role);
    return canViewStrategic || can.manageInitiative(role);
  };

  const showStrategicNav =
    (modules.portfolio && canAccessPortfolio("view")) ||
    (modules.program && canAccessProgram("view")) ||
    ((modules.initiative || modules.strategicObjectives) &&
      canAccessInitiative("view"));

  const showProjectsNav =
    can.manageRecords(role) || can.execute(role) || can.closeRecords(role);

  return {
    modules,
    clientType,
    clientMeta,
    isEnabled,
    canAccessPortfolio,
    canAccessProgram,
    canAccessInitiative,
    showStrategicNav,
    showProjectsNav,
    canViewStrategic,
  };
}
