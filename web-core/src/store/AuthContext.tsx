import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LS } from "../demo-mode/keys";
import { saveJson } from "../demo-mode/storage";
import { SEED_DEMO_USERS, SEED_ORG } from "../lib/hierarchySeed";
import {
  migrateOrganizations,
  modulesForClientType,
  normalizeOrgModules,
  type OrgEnabledModules,
} from "../lib/orgModules";
import {
  normalizePortfolioPolicy,
  policyForClientType,
} from "../lib/orgPortfolioPolicy";
import type {
  DemoInvite,
  DemoSession,
  DemoUser,
  OrgClientType,
  OrgPortfolioPolicy,
  Organization,
} from "../models/domain";
import type { AnyRoleId, PermissionKey, User } from "../lib/types";
import {
  AuthServiceError,
  authenticateCredentials,
  clearSession,
  createSession,
  readSession,
  verifyMfaOtp,
} from "../services/authService";
import { organizationsRepository, usersRepository } from "../repositories";

const SEED_USERS: DemoUser[] = SEED_DEMO_USERS.map((u) => ({ ...u }));

interface AuthCtx {
  user: User | null;
  users: User[];
  session: DemoSession | null;
  organization: Organization | null;
  organizations: Organization[];
  permissions: PermissionKey[];
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; needsMfa?: boolean; reason?: string; pendingUser?: DemoUser }>;
  completeMfa: (otp: string, pendingUser: DemoUser) => Promise<{ ok: boolean; reason?: string }>;
  loginAs: (user: User) => void;
  register: (data: Omit<User, "id"> & { password?: string }) => User;
  registerOrganization: (input: {
    orgName: string;
    sector: string;
    city: string;
    adminName: string;
    adminEmail: string;
    password: string;
  }) => { ok: boolean; reason?: string };
  provisionFromInvite: (invite: DemoInvite) => { ok: boolean; reason?: string; user?: User };
  resetPassword: (email: string, newPassword: string) => { ok: boolean; reason?: string };
  logout: () => void;
  setUserRole: (id: string, role: AnyRoleId) => void;
  toggleActive: (id: string) => void;
  setUsers: (users: DemoUser[]) => void;
  updateOrganizationModules: (modules: Partial<OrgEnabledModules>) => void;
  updateOrganizationClientType: (clientType: OrgClientType) => void;
  updateOrganizationPortfolioPolicy: (
    policy: OrgPortfolioPolicy,
    opts?: { alsoSetClientType?: boolean },
  ) => { ok: boolean; reason?: string };
}

const Ctx = createContext<AuthCtx | null>(null);

function toPublicUser(u: DemoUser): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsersState] = useState<DemoUser[]>(() => {
    const stored = usersRepository.read();
    return stored.length ? stored : SEED_USERS;
  });
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    const migrated = migrateOrganizations(organizationsRepository.read());
    return migrated.map((o) => ({
      ...o,
      portfolioPolicy: normalizePortfolioPolicy(
        o.portfolioPolicy,
        o.clientType ?? "government",
      ),
    }));
  });
  const [session, setSession] = useState<DemoSession | null>(() => readSession());

  useEffect(() => {
    saveJson(LS.users, users);
  }, [users]);

  useEffect(() => {
    saveJson(LS.organizations, organizations);
  }, [organizations]);

  const user = useMemo(() => {
    if (!session) return null;
    const found = users.find((u) => u.id === session.userId);
    return found ? toPublicUser(found) : null;
  }, [session, users]);

  const organization = useMemo(() => {
    if (!session) return null;
    const found =
      organizations.find((o) => o.id === session.organizationId) ??
      organizations.find((o) => o.id === SEED_ORG.id) ??
      null;
    if (!found) return null;
    const base = migrateOrganizations([found])[0];
    return {
      ...found,
      ...base,
      portfolioPolicy: normalizePortfolioPolicy(
        found.portfolioPolicy ?? base.portfolioPolicy,
        base.clientType,
      ),
    };
  }, [session, organizations]);

  const permissions = session?.permissions ?? [];

  const establish = (demoUser: DemoUser) => {
    const s = createSession(demoUser);
    setSession(s);
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await authenticateCredentials(users, email, password);
      if (res.needsMfa) {
        return { ok: true, needsMfa: true, pendingUser: res.user };
      }
      establish(res.user);
      return { ok: true };
    } catch (e) {
      const err = e as AuthServiceError;
      return { ok: false, reason: err.message || "تعذّر تسجيل الدخول." };
    }
  };

  const completeMfa = async (otp: string, pendingUser: DemoUser) => {
    try {
      await verifyMfaOtp(otp);
      establish(pendingUser);
      return { ok: true };
    } catch (e) {
      const err = e as AuthServiceError;
      return { ok: false, reason: err.message };
    }
  };

  const loginAs = (u: User) => {
    const fresh = users.find((x) => x.id === u.id);
    if (!fresh || fresh.active === false) return;
    establish(fresh);
  };

  const register = (data: Omit<User, "id"> & { password?: string }): User => {
    const newUser: DemoUser = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      password: data.password || "demo1234",
      role: (data.role as DemoUser["role"]) || "member",
      organizationId: data.organizationId || SEED_ORG.id,
      branchId: data.branchId,
      departmentId: data.departmentId,
      active: true,
    };
    setUsersState((prev) => [...prev, newUser]);
    establish(newUser);
    return toPublicUser(newUser);
  };

  const registerOrganization = (input: {
    orgName: string;
    sector: string;
    city: string;
    adminName: string;
    adminEmail: string;
    password: string;
  }) => {
    const email = input.adminEmail.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false, reason: "البريد مستخدم مسبقاً." };
    }
    const org: Organization = {
      id: `org-${crypto.randomUUID().slice(0, 8)}`,
      name: input.orgName,
      sector: input.sector,
      city: input.city,
      active: true,
      createdAt: new Date().toISOString(),
      clientType: "small",
      enabledModules: modulesForClientType("small"),
      portfolioPolicy: policyForClientType("small"),
    };
    const admin: DemoUser = {
      id: crypto.randomUUID(),
      name: input.adminName,
      email: input.adminEmail.trim(),
      password: input.password,
      role: "org_admin",
      organizationId: org.id,
      branchId: "riyadh",
      active: true,
    };
    setOrganizations((prev) => [...prev, org]);
    setUsersState((prev) => [...prev, admin]);
    establish(admin);
    return { ok: true };
  };

  const provisionFromInvite = (invite: DemoInvite) => {
    if (users.some((u) => u.email.toLowerCase() === invite.email.toLowerCase())) {
      return { ok: false, reason: "المستخدم موجود مسبقاً لهذا البريد." };
    }
    const newUser: DemoUser = {
      id: crypto.randomUUID(),
      name: invite.name,
      email: invite.email,
      password: "demo1234",
      role: invite.role,
      organizationId: invite.organizationId,
      active: true,
      scopedProjectIds: invite.projectId ? [invite.projectId] : undefined,
    };
    setUsersState((prev) => [...prev, newUser]);
    return { ok: true, user: toPublicUser(newUser) };
  };

  const resetPassword = (email: string, newPassword: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      return { ok: false, reason: "أدخل بريداً إلكترونياً صالحاً." };
    }
    if (newPassword.trim().length < 6) {
      return { ok: false, reason: "كلمة المرور يجب ألا تقل عن 6 أحرف." };
    }
    const found = users.find((u) => u.email.toLowerCase() === normalized);
    if (!found) {
      return { ok: false, reason: "لا يوجد حساب بهذا البريد." };
    }
    if (found.active === false) {
      return { ok: false, reason: "هذا الحساب معطّل. تواصل مع مسؤول المؤسسة." };
    }
    setUsersState((prev) =>
      prev.map((u) =>
        u.email.toLowerCase() === normalized
          ? { ...u, password: newPassword.trim() }
          : u,
      ),
    );
    return { ok: true };
  };

  const setUserRole = (id: string, role: AnyRoleId) => {
    setUsersState((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const toggleActive = (id: string) => {
    setUsersState((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, active: u.active === false ? true : false } : u,
      ),
    );
    if (user?.id === id) logout();
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  const setUsers = (next: DemoUser[]) => setUsersState(next);

  const updateOrganizationModules = (modules: Partial<OrgEnabledModules>) => {
    if (!session?.organizationId) return;
    const orgId = session.organizationId;
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgId
          ? {
              ...o,
              enabledModules: normalizeOrgModules({
                ...o.enabledModules,
                ...modules,
              }),
            }
          : o,
      ),
    );
  };

  const updateOrganizationClientType = (clientType: OrgClientType) => {
    if (!session?.organizationId) return;
    const orgId = session.organizationId;
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgId
          ? {
              ...o,
              clientType,
              enabledModules: modulesForClientType(clientType),
              portfolioPolicy: {
                ...policyForClientType(clientType),
                updatedAt: new Date().toISOString(),
              },
            }
          : o,
      ),
    );
  };

  const updateOrganizationPortfolioPolicy = (
    policy: OrgPortfolioPolicy,
    opts?: { alsoSetClientType?: boolean },
  ): { ok: boolean; reason?: string } => {
    if (!session?.organizationId) {
      return { ok: false, reason: "لا توجد مؤسسة نشطة." };
    }
    const next = normalizePortfolioPolicy(policy, organization?.clientType);
    if (!next.stages.some((s) => s.enabled)) {
      return {
        ok: false,
        reason: "يجب تفعيل مرحلة اعتماد أو مراجعة واحدة على الأقل قبل الحفظ.",
      };
    }
    if (next.fiscalYearStartMonth < 1 || next.fiscalYearStartMonth > 12) {
      return { ok: false, reason: "شهر بداية السنة المالية غير صالح." };
    }
    const orgId = session.organizationId;
    const stamp = new Date().toISOString();
    setOrganizations((prev) =>
      prev.map((o) => {
        if (o.id !== orgId) return o;
        const bumpVersion =
          JSON.stringify(o.portfolioPolicy?.stages) !==
            JSON.stringify(next.stages) ||
          o.portfolioPolicy?.workflowMode !== next.workflowMode;
        const mappedClient: OrgClientType | undefined =
          next.profileTemplate === "small" ||
          next.profileTemplate === "enterprise" ||
          next.profileTemplate === "government"
            ? next.profileTemplate
            : undefined;
        return {
          ...o,
          clientType:
            opts?.alsoSetClientType && mappedClient
              ? mappedClient
              : o.clientType,
          enabledModules:
            opts?.alsoSetClientType && mappedClient
              ? modulesForClientType(mappedClient)
              : o.enabledModules,
          portfolioPolicy: {
            ...next,
            version: bumpVersion
              ? (o.portfolioPolicy?.version ?? next.version) + 1
              : next.version,
            updatedAt: stamp,
          },
        };
      }),
    );
    return { ok: true };
  };

  return (
    <Ctx.Provider
      value={{
        user,
        users: users.map(toPublicUser),
        session,
        organization,
        organizations,
        permissions,
        login,
        completeMfa,
        loginAs,
        register,
        registerOrganization,
        provisionFromInvite,
        resetPassword,
        logout,
        setUserRole,
        toggleActive,
        setUsers,
        updateOrganizationModules,
        updateOrganizationClientType,
        updateOrganizationPortfolioPolicy,
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
