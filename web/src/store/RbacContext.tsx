import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_MATRIX, ROLES } from "../lib/constants";
import type { AnyRoleId, PermissionKey, Role } from "../lib/types";

const LS_ROLES = "pms_roles_v1";
const LS_MATRIX = "pms_matrix_v1";

type Matrix = Record<AnyRoleId, PermissionKey[]>;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface RbacCtx {
  roles: Role[];
  matrix: Matrix;
  hasPermission: (role: AnyRoleId | undefined, key: PermissionKey) => boolean;
  togglePermission: (role: AnyRoleId, key: PermissionKey) => void;
  addRole: (name: string, description?: string) => Role;
  removeRole: (id: AnyRoleId) => void;
  resetRbac: () => void;
}

const Ctx = createContext<RbacCtx | null>(null);

export function RbacProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<Role[]>(() => load(LS_ROLES, ROLES));
  const [matrix, setMatrix] = useState<Matrix>(() =>
    load(LS_MATRIX, DEFAULT_MATRIX),
  );

  useEffect(() => {
    localStorage.setItem(LS_ROLES, JSON.stringify(roles));
  }, [roles]);
  useEffect(() => {
    localStorage.setItem(LS_MATRIX, JSON.stringify(matrix));
  }, [matrix]);

  const hasPermission = useCallback(
    (role: AnyRoleId | undefined, key: PermissionKey) =>
      !!role && (matrix[role]?.includes(key) ?? false),
    [matrix],
  );

  const togglePermission = useCallback((role: AnyRoleId, key: PermissionKey) => {
    setMatrix((prev) => {
      const current = prev[role] ?? [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      return { ...prev, [role]: next };
    });
  }, []);

  const addRole = useCallback((name: string, description = "") => {
    const id = `role_${crypto.randomUUID().slice(0, 8)}`;
    const role: Role = { id, name, description, custom: true };
    setRoles((prev) => [...prev, role]);
    setMatrix((prev) => ({ ...prev, [id]: ["dashboard"] }));
    return role;
  }, []);

  const removeRole = useCallback((id: AnyRoleId) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    setMatrix((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const resetRbac = useCallback(() => {
    setRoles(ROLES);
    setMatrix(DEFAULT_MATRIX);
  }, []);

  const value = useMemo<RbacCtx>(
    () => ({
      roles,
      matrix,
      hasPermission,
      togglePermission,
      addRole,
      removeRole,
      resetRbac,
    }),
    [roles, matrix, hasPermission, togglePermission, addRole, removeRole, resetRbac],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRbac() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRbac must be used within RbacProvider");
  return ctx;
}

/** Dynamic permission helpers that read from the editable matrix. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCan() {
  const { hasPermission } = useRbac();
  return useMemo(
    () => ({
      dashboard: (role?: AnyRoleId) => hasPermission(role, "dashboard"),
      manageRecords: (role?: AnyRoleId) => hasPermission(role, "manageRecords"),
      execute: (role?: AnyRoleId) => hasPermission(role, "execute"),
      closeRecords: (role?: AnyRoleId) => hasPermission(role, "close"),
      sendUrgent: (role?: AnyRoleId) => hasPermission(role, "urgent"),
      manageNews: (role?: AnyRoleId, newsAdmin?: boolean) =>
        hasPermission(role, "news") || !!newsAdmin,
      viewSettings: (role?: AnyRoleId) => hasPermission(role, "settings"),
      viewPlatform: (role?: AnyRoleId) =>
        role === "platform_admin" || role === "super_admin",
    }),
    [hasPermission],
  );
}
