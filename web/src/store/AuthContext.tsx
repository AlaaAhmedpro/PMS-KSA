import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { USERS } from "../lib/mockData";
import type { AnyRoleId, User } from "../lib/types";

const LS_USER = "pms_user";
const LS_USERS = "pms_users_v1";

const SEED_USERS: User[] = USERS.map((u) => ({ ...u, active: true }));

interface AuthCtx {
  user: User | null;
  users: User[];
  login: (email: string) => { ok: boolean; reason?: string };
  loginAs: (user: User) => void;
  register: (data: Omit<User, "id">) => User;
  logout: () => void;
  grantNewsAdmin: (id: string, value: boolean) => void;
  setUserRole: (id: string, role: AnyRoleId) => void;
  toggleActive: (id: string) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => load(LS_USERS, SEED_USERS));
  const [user, setUser] = useState<User | null>(() => load(LS_USER, null));

  useEffect(() => {
    if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
    else localStorage.removeItem(LS_USER);
  }, [user]);

  useEffect(() => {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  }, [users]);

  const login = (email: string) => {
    const found = users.find((u) => u.email === email);
    if (!found) return { ok: false, reason: "البريد غير موجود" };
    if (found.active === false)
      return { ok: false, reason: "هذا المستخدم معطّل، تواصل مع المسؤول" };
    setUser(found);
    return { ok: true };
  };

  const loginAs = (u: User) => {
    const fresh = users.find((x) => x.id === u.id) ?? u;
    setUser(fresh);
  };

  const register = (data: Omit<User, "id">): User => {
    const newUser: User = { ...data, id: crypto.randomUUID(), active: true };
    setUsers((prev) => [...prev, newUser]);
    setUser(newUser);
    return newUser;
  };

  const grantNewsAdmin = (id: string, value: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, newsAdmin: value } : u)),
    );
    if (user?.id === id) setUser({ ...user, newsAdmin: value });
  };

  const setUserRole = (id: string, role: AnyRoleId) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    if (user?.id === id) setUser({ ...user, role });
  };

  const toggleActive = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, active: u.active === false ? true : false } : u,
      ),
    );
    if (user?.id === id) logout();
  };

  const logout = () => setUser(null);

  return (
    <Ctx.Provider
      value={{
        user,
        users,
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
