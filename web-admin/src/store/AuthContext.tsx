import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ADMIN_USERS } from "../lib/adminUsers";
import type { AnyRoleId, User } from "../lib/types";
import { DEMO_MODE } from "../demo-mode/config";
import { ADMIN_LS } from "../demo-mode/keys";
import { loadJson, saveJson } from "../demo-mode/storage";
import {
  AuthServiceError,
  authenticateAdmin,
  clearAdminSession,
  createAdminSession,
  readAdminSession,
} from "../services/authService";

type AdminUser = User & { password?: string };

const SEED_USERS: AdminUser[] = ADMIN_USERS.map((u) => ({
  ...u,
  active: true,
  password: DEMO_MODE.defaultPassword,
}));

interface AuthCtx {
  user: User | null;
  users: User[];
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; reason?: string }>;
  loginAs: (user: User) => void;
  register: (data: Omit<User, "id"> & { password?: string }) => User;
  logout: () => void;
  grantNewsAdmin: (id: string, value: boolean) => void;
  setUserRole: (id: string, role: AnyRoleId) => void;
  toggleActive: (id: string) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>(() =>
    loadJson(ADMIN_LS.users, SEED_USERS),
  );
  const [session, setSession] = useState(() => readAdminSession());

  useEffect(() => {
    saveJson(ADMIN_LS.users, users);
  }, [users]);

  const user = useMemo(() => {
    if (!session) return null;
    const found = users.find((u) => u.id === session.userId);
    if (!found) return null;
    const { password: _p, ...rest } = found;
    return rest;
  }, [session, users]);

  const login = async (email: string, password: string) => {
    try {
      const found = await authenticateAdmin(users, email, password);
      const s = createAdminSession(found);
      setSession(s);
      return { ok: true };
    } catch (e) {
      const err = e as AuthServiceError;
      return { ok: false, reason: err.message };
    }
  };

  const loginAs = (u: User) => {
    const fresh = users.find((x) => x.id === u.id);
    if (!fresh || fresh.active === false) return;
    setSession(createAdminSession(fresh));
  };

  const register = (data: Omit<User, "id"> & { password?: string }): User => {
    const newUser: AdminUser = {
      ...data,
      id: crypto.randomUUID(),
      active: true,
      role: "platform_admin",
      password: data.password || DEMO_MODE.defaultPassword,
    };
    setUsers((prev) => [...prev, newUser]);
    setSession(createAdminSession(newUser));
    const { password: _p, ...rest } = newUser;
    return rest;
  };

  const grantNewsAdmin = () => undefined;
  const setUserRole = (id: string, role: AnyRoleId) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const toggleActive = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, active: u.active === false ? true : false } : u,
      ),
    );
    if (user?.id === id) logout();
  };

  const logout = () => {
    clearAdminSession();
    setSession(null);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        users: users.map(({ password: _p, ...rest }) => rest),
        login,
        loginAs,
        register,
        logout,
        grantNewsAdmin,
        setUserRole,
        toggleActive,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
