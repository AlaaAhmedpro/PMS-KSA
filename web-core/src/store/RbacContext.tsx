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

const LS_ROLES = "pms_core_roles_v1";
const LS_MATRIX = "pms_core_matrix_v1";

type Matrix = Record<AnyRoleId, PermissionKey[]>;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** One-time merge of new strategic permission keys into stored matrix. */
function migrateMatrix(stored: Matrix): Matrix {
  const allKeys = Object.values(stored).flat();
  const needsMigrate =
    !allKeys.includes("manageProgram") &&
    !allKeys.includes("manageInitiative") &&
    !allKeys.includes("viewStrategic");
  if (!needsMigrate) return stored;

  const next: Matrix = { ...stored };
  for (const [roleId, keys] of Object.entries(DEFAULT_MATRIX)) {
    const current = next[roleId] ?? [];
    const missing = keys.filter((k) => !current.includes(k));
    if (missing.length) {
      next[roleId] = [...current, ...missing];
    }
  }
  return next;
}

interface RbacCtx {
  roles: Role[];
  matrix: Matrix;
  hasPermission: (role: AnyRoleId | undefined, key: PermissionKey) => boolean;
  togglePermission: (role: AnyRoleId, key: PermissionKey) => void;
  setRolePermissions: (role: AnyRoleId, keys: PermissionKey[]) => void;
  addRole: (name: string, description?: string) => Role;
  updateRole: (
    id: AnyRoleId,
    patch: { name?: string; description?: string },
  ) => { ok: boolean; reason?: string };
  duplicateRole: (id: AnyRoleId) => { ok: boolean; role?: Role; reason?: string };
  removeRole: (id: AnyRoleId) => { ok: boolean; reason?: string };
  resetRolePermissions: (id: AnyRoleId) => { ok: boolean; reason?: string };
  resetRbac: () => void;
}

const Ctx = createContext<RbacCtx | null>(null);

export function RbacProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<Role[]>(() => load(LS_ROLES, ROLES));
  const [matrix, setMatrix] = useState<Matrix>(() =>
    migrateMatrix(load(LS_MATRIX, DEFAULT_MATRIX)),
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

  const setRolePermissions = useCallback(
    (role: AnyRoleId, keys: PermissionKey[]) => {
      setMatrix((prev) => ({ ...prev, [role]: [...keys] }));
    },
    [],
  );

  const addRole = useCallback((name: string, description = "") => {
    const id = `role_${crypto.randomUUID().slice(0, 8)}`;
    const role: Role = { id, name, description, custom: true };
    setRoles((prev) => [...prev, role]);
    setMatrix((prev) => ({ ...prev, [id]: ["dashboard"] }));
    return role;
  }, []);

  const updateRole = useCallback(
    (id: AnyRoleId, patch: { name?: string; description?: string }) => {
      const target = roles.find((r) => r.id === id);
      if (!target) return { ok: false, reason: "الدور غير موجود." };
      const name = patch.name?.trim();
      if (name !== undefined && !name) {
        return { ok: false, reason: "اسم الدور مطلوب." };
      }
      setRoles((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                name: name ?? r.name,
                description:
                  patch.description !== undefined
                    ? patch.description.trim()
                    : r.description,
              }
            : r,
        ),
      );
      return { ok: true };
    },
    [roles],
  );

  const duplicateRole = useCallback(
    (id: AnyRoleId) => {
      const source = roles.find((r) => r.id === id);
      if (!source) return { ok: false, reason: "الدور غير موجود." };
      const newId = `role_${crypto.randomUUID().slice(0, 8)}`;
      const role: Role = {
        id: newId,
        name: `${source.name} (نسخة)`,
        description: source.description,
        custom: true,
      };
      const perms = [...(matrix[id] ?? ["dashboard"])];
      setRoles((prev) => [...prev, role]);
      setMatrix((prev) => ({ ...prev, [newId]: perms }));
      return { ok: true, role };
    },
    [roles, matrix],
  );

  const removeRole = useCallback(
    (id: AnyRoleId) => {
      const target = roles.find((r) => r.id === id);
      if (!target) return { ok: false, reason: "الدور غير موجود." };
      if (!target.custom) {
        return { ok: false, reason: "لا يمكن حذف أدوار النظام الأساسية." };
      }
      setRoles((prev) => prev.filter((r) => r.id !== id));
      setMatrix((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return { ok: true };
    },
    [roles],
  );

  const resetRolePermissions = useCallback(
    (id: AnyRoleId) => {
      const defaults = DEFAULT_MATRIX[id];
      if (!defaults) {
        return {
          ok: false,
          reason: "لا توجد صلاحيات افتراضية لهذا الدور المخصص.",
        };
      }
      setMatrix((prev) => ({ ...prev, [id]: [...defaults] }));
      return { ok: true };
    },
    [],
  );

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
      setRolePermissions,
      addRole,
      updateRole,
      duplicateRole,
      removeRole,
      resetRolePermissions,
      resetRbac,
    }),
    [
      roles,
      matrix,
      hasPermission,
      togglePermission,
      setRolePermissions,
      addRole,
      updateRole,
      duplicateRole,
      removeRole,
      resetRolePermissions,
      resetRbac,
    ],
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
      viewSettings: (role?: AnyRoleId) => hasPermission(role, "settings"),
      managePeople: (role?: AnyRoleId) => hasPermission(role, "managePeople"),
      managePortfolio: (role?: AnyRoleId) =>
        hasPermission(role, "managePortfolio"),
      manageProgram: (role?: AnyRoleId) => hasPermission(role, "manageProgram"),
      manageInitiative: (role?: AnyRoleId) =>
        hasPermission(role, "manageInitiative"),
      viewStrategic: (role?: AnyRoleId) => hasPermission(role, "viewStrategic"),
    }),
    [hasPermission],
  );
}
