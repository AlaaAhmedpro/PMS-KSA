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
import { SEED_VENDOR_USERS } from "../lib/vendorSeed";
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
  CoreRoleId,
  DemoInvite,
  DemoSession,
  DemoUser,
  OrgClientType,
  OrgPortfolioPolicy,
  Organization,
  UserProvisionMethod,
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
import {
  generateTempPassword,
  pushSentMail,
} from "../lib/demoMail";
import { organizationsRepository, usersRepository } from "../repositories";
import { isCoreOrgSuspended } from "../lib/billingBridge";

const SEED_USERS: DemoUser[] = [...SEED_DEMO_USERS, ...SEED_VENDOR_USERS].map(
  (u) => ({ ...u }),
);

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
  ) => Promise<{
    ok: boolean;
    needsMfa?: boolean;
    needsPasswordChange?: boolean;
    reason?: string;
    pendingUser?: DemoUser;
  }>;
  completeMfa: (
    otp: string,
    pendingUser: DemoUser,
  ) => Promise<{ ok: boolean; needsPasswordChange?: boolean; reason?: string }>;
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
  provisionUser: (input: {
    name: string;
    email: string;
    role: CoreRoleId;
    projectId?: string;
    vendorId?: string;
    scopedProjectIds?: string[];
    method: UserProvisionMethod;
  }) => {
    ok: boolean;
    reason?: string;
    user?: User;
    tempPassword?: string;
    activationToken?: string;
    mailPreview?: string;
  };
  activateAccount: (
    token: string,
    newPassword: string,
  ) => { ok: boolean; reason?: string };
  changeOwnPassword: (
    currentPassword: string,
    newPassword: string,
  ) => { ok: boolean; reason?: string };
  resendProvisionMail: (userId: string) => {
    ok: boolean;
    reason?: string;
    tempPassword?: string;
    activationToken?: string;
    mailPreview?: string;
  };
  resetPassword: (email: string, newPassword: string) => { ok: boolean; reason?: string };
  logout: () => void;
  setUserRole: (id: string, role: AnyRoleId) => void;
  toggleActive: (id: string) => void;
  syncVendorStaffScopes: (vendorId: string, projectIds: string[]) => void;
  grantVendorAdminAccess: (
    userId: string,
    vendorId: string,
    opts?: { website?: string; vendorName?: string },
  ) => {
    ok: boolean;
    reason?: string;
    tempPassword?: string;
    mailPreview?: string;
  };
  detachVendorUsers: (vendorId: string) => void;
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
      if (
        res.user.organizationId &&
        isCoreOrgSuspended(res.user.organizationId)
      ) {
        return {
          ok: false,
          reason:
            "تم تعليق اشتراك المنشأة من لوحة المنصة. راجع الفوترة أو تواصل مع الدعم.",
        };
      }
      if (res.needsMfa) {
        return { ok: true, needsMfa: true, pendingUser: res.user };
      }
      establish(res.user);
      return {
        ok: true,
        needsPasswordChange: Boolean(res.user.mustChangePassword),
      };
    } catch (e) {
      const err = e as AuthServiceError;
      return { ok: false, reason: err.message || "تعذّر تسجيل الدخول." };
    }
  };

  const completeMfa = async (otp: string, pendingUser: DemoUser) => {
    try {
      await verifyMfaOtp(otp);
      if (
        pendingUser.organizationId &&
        isCoreOrgSuspended(pendingUser.organizationId)
      ) {
        return {
          ok: false,
          reason:
            "تم تعليق اشتراك المنشأة من لوحة المنصة. راجع الفوترة أو تواصل مع الدعم.",
        };
      }
      establish(pendingUser);
      return {
        ok: true,
        needsPasswordChange: Boolean(pendingUser.mustChangePassword),
      };
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
      emailVerified: true,
      mustChangePassword: true,
      provisionMethod: "temp_password",
      scopedProjectIds: invite.projectId ? [invite.projectId] : undefined,
    };
    setUsersState((prev) => [...prev, newUser]);
    return { ok: true, user: toPublicUser(newUser) };
  };

  const provisionUser = (input: {
    name: string;
    email: string;
    role: CoreRoleId;
    projectId?: string;
    vendorId?: string;
    scopedProjectIds?: string[];
    method: UserProvisionMethod;
  }) => {
    const name = input.name.trim();
    const email = input.email.trim();
    if (!name || !email.includes("@")) {
      return { ok: false, reason: "الاسم والبريد الصالح مطلوبان." };
    }
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, reason: "البريد مستخدم مسبقاً." };
    }
    const orgId = session?.organizationId || organization?.id || SEED_ORG.id;
    const activationToken =
      input.method === "activation_link"
        ? `act-${crypto.randomUUID().slice(0, 10)}`
        : undefined;
    const tempPassword =
      input.method === "temp_password" ? generateTempPassword() : undefined;
    const scoped =
      input.scopedProjectIds ??
      (input.projectId ? [input.projectId] : undefined);
    const newUser: DemoUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password:
        input.method === "temp_password"
          ? (tempPassword as string)
          : `pending-${crypto.randomUUID().slice(0, 8)}`,
      role: input.role,
      organizationId: orgId,
      active: true,
      emailVerified: input.method === "temp_password",
      mustChangePassword: true,
      activationToken,
      provisionMethod: input.method,
      vendorId: input.vendorId,
      scopedProjectIds: scoped,
    };
    setUsersState((prev) => [...prev, newUser]);

    let mailPreview = "";
    if (input.method === "temp_password" && tempPassword) {
      mailPreview = [
        `مرحباً ${name}`,
        "",
        "تم إنشاء حسابك في منظومة إدارة المشاريع.",
        `البريد: ${email}`,
        `كلمة المرور المؤقتة: ${tempPassword}`,
        "عند أول دخول سيُطلب منك تعيين كلمة مرور جديدة.",
      ].join("\n");
      pushSentMail({
        to: email,
        subject: "بيانات الدخول المؤقتة",
        body: mailPreview,
        kind: "temp_password",
      });
    } else if (activationToken) {
      mailPreview = [
        `مرحباً ${name}`,
        "",
        "تم إنشاء حسابك. فعّل البريد وعيّن كلمة المرور عبر الرابط:",
        `${window.location.origin}/activate?token=${activationToken}`,
        "",
        `رمز التفعيل (Demo): ${activationToken}`,
      ].join("\n");
      pushSentMail({
        to: email,
        subject: "تفعيل الحساب",
        body: mailPreview,
        kind: "activation",
      });
    }

    return {
      ok: true,
      user: toPublicUser(newUser),
      tempPassword,
      activationToken,
      mailPreview,
    };
  };

  const activateAccount = (token: string, newPassword: string) => {
    const cleaned = token.trim();
    if (!cleaned) return { ok: false, reason: "رمز التفعيل مطلوب." };
    if (newPassword.trim().length < 6) {
      return { ok: false, reason: "كلمة المرور يجب ألا تقل عن 6 أحرف." };
    }
    const found = users.find((u) => u.activationToken === cleaned);
    if (!found) return { ok: false, reason: "رمز التفعيل غير صالح أو منتهٍ." };
    if (found.active === false) {
      return { ok: false, reason: "هذا الحساب معطّل." };
    }
    const updated: DemoUser = {
      ...found,
      password: newPassword.trim(),
      emailVerified: true,
      mustChangePassword: false,
      activationToken: undefined,
    };
    setUsersState((prev) => prev.map((u) => (u.id === found.id ? updated : u)));
    establish(updated);
    return { ok: true };
  };

  const changeOwnPassword = (currentPassword: string, newPassword: string) => {
    if (!session) return { ok: false, reason: "يلزم تسجيل الدخول." };
    if (newPassword.trim().length < 6) {
      return { ok: false, reason: "كلمة المرور يجب ألا تقل عن 6 أحرف." };
    }
    const found = users.find((u) => u.id === session.userId);
    if (!found) return { ok: false, reason: "المستخدم غير موجود." };
    if (found.password !== currentPassword) {
      return { ok: false, reason: "كلمة المرور الحالية غير صحيحة." };
    }
    setUsersState((prev) =>
      prev.map((u) =>
        u.id === found.id
          ? {
              ...u,
              password: newPassword.trim(),
              mustChangePassword: false,
              emailVerified: true,
            }
          : u,
      ),
    );
    return { ok: true };
  };

  const resendProvisionMail = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (!found) return { ok: false, reason: "المستخدم غير موجود." };
    if (found.provisionMethod === "activation_link" || found.emailVerified === false) {
      const activationToken =
        found.activationToken || `act-${crypto.randomUUID().slice(0, 10)}`;
      setUsersState((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                activationToken,
                emailVerified: false,
                mustChangePassword: true,
                provisionMethod: "activation_link",
              }
            : u,
        ),
      );
      const mailPreview = [
        `مرحباً ${found.name}`,
        "",
        "إعادة إرسال رابط تفعيل الحساب:",
        `${window.location.origin}/activate?token=${activationToken}`,
        `رمز التفعيل (Demo): ${activationToken}`,
      ].join("\n");
      pushSentMail({
        to: found.email,
        subject: "إعادة إرسال تفعيل الحساب",
        body: mailPreview,
        kind: "resend",
      });
      return { ok: true, activationToken, mailPreview };
    }
    const tempPassword = generateTempPassword();
    setUsersState((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              password: tempPassword,
              mustChangePassword: true,
              emailVerified: true,
              provisionMethod: "temp_password",
            }
          : u,
      ),
    );
    const mailPreview = [
      `مرحباً ${found.name}`,
      "",
      "إعادة إرسال كلمة مرور مؤقتة:",
      `كلمة المرور المؤقتة: ${tempPassword}`,
      "غيّر كلمة المرور عند أول دخول.",
    ].join("\n");
    pushSentMail({
      to: found.email,
      subject: "إعادة إرسال بيانات الدخول",
      body: mailPreview,
      kind: "resend",
    });
    return { ok: true, tempPassword, mailPreview };
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
    if (found.emailVerified === false) {
      return {
        ok: false,
        reason: "فعّل الحساب عبر رابط البريد قبل إعادة تعيين كلمة المرور.",
      };
    }
    setUsersState((prev) =>
      prev.map((u) =>
        u.email.toLowerCase() === normalized
          ? { ...u, password: newPassword.trim(), mustChangePassword: false }
          : u,
      ),
    );
    return { ok: true };
  };

  const setUserRole = (id: string, role: AnyRoleId) => {
    setUsersState((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const syncVendorStaffScopes = (vendorId: string, projectIds: string[]) => {
    setUsersState((prev) =>
      prev.map((u) =>
        u.vendorId === vendorId ? { ...u, scopedProjectIds: [...projectIds] } : u,
      ),
    );
  };

  const grantVendorAdminAccess = (
    userId: string,
    vendorId: string,
    opts?: { website?: string; vendorName?: string },
  ) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { ok: false, reason: "المستخدم غير موجود." };
    if (target.active === false) {
      return { ok: false, reason: "لا يمكن تعيين حساب معطّل كمسؤول مورد." };
    }
    if (target.vendorId && target.vendorId !== vendorId) {
      return { ok: false, reason: "المستخدم مرتبط بمورد آخر مسبقاً." };
    }
    if (target.role === "org_admin") {
      return {
        ok: false,
        reason: "لا يمكن تحويل مسؤول المنشأة إلى مسؤول مورد.",
      };
    }

    const tempPassword = generateTempPassword();
    const origin = window.location.origin;
    const website = opts?.website?.trim();
    const vendorName = opts?.vendorName?.trim();

    setUsersState((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              role: "vendor_admin" as const,
              vendorId,
              password: tempPassword,
              mustChangePassword: true,
              emailVerified: true,
              provisionMethod: "temp_password" as const,
              activationToken: undefined,
              active: true,
            }
          : u,
      ),
    );

    const mailPreview = [
      `مرحباً ${target.name}`,
      "",
      vendorName
        ? `تم تعيينك كمسؤول مورد «${vendorName}» في منظومة إدارة المشاريع.`
        : "تم تعيينك كمسؤول مورد في منظومة إدارة المشاريع.",
      `البريد: ${target.email}`,
      target.phone ? `الجوال: ${target.phone}` : "",
      `كلمة المرور المؤقتة: ${tempPassword}`,
      "",
      `رابط تسجيل الدخول: ${origin}/login`,
      `بعد الدخول سيُطلب منك تعيين كلمة مرور جديدة عبر: ${origin}/change-password`,
      website ? `موقع المورد: ${website}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    pushSentMail({
      to: target.email,
      subject: "بيانات دخول مسؤول المورد",
      body: mailPreview,
      kind: "temp_password",
    });

    return { ok: true, tempPassword, mailPreview };
  };

  const detachVendorUsers = (vendorId: string) => {
    setUsersState((prev) =>
      prev.map((u) =>
        u.vendorId === vendorId
          ? {
              ...u,
              vendorId: undefined,
              scopedProjectIds: undefined,
              role:
                u.role === "vendor_admin" || u.role === "vendor_member"
                  ? "member"
                  : u.role,
            }
          : u,
      ),
    );
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
        provisionUser,
        activateAccount,
        changeOwnPassword,
        resendProvisionMail,
        resetPassword,
        logout,
        setUserRole,
        toggleActive,
        syncVendorStaffScopes,
        grantVendorAdminAccess,
        detachVendorUsers,
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
