import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyDemoDataMigration, PLATFORM_LS } from "../lib/demoSeed";
import {
  SEED_DEMO_REQUESTS,
  SEED_PLANS,
  SEED_TENANTS,
} from "../lib/platformSeed";
import type {
  DemoRequest,
  DemoRequestStatus,
  OrgAdminAssignment,
  OrgClientType,
  OrgEnabledModules,
  PlatformTenant,
  SubscriptionPlan,
  TenantPlanId,
  TenantStatus,
} from "../lib/types";
import {
  modulesForClientType,
  normalizeOrgModules,
  syncTenantModulesToCore,
} from "../lib/orgModules";
import { migrateTenants } from "../lib/migrateTenants";
import { migratePlans } from "../lib/migratePlans";
import { ADMIN_LS } from "../demo-mode/keys";
import { loadJson, saveJson } from "../demo-mode/storage";
import { demoDelay } from "../demo-mode/config";

function pushToCore(t: PlatformTenant) {
  if (!t.organizationId) return;
  syncTenantModulesToCore({
    organizationId: t.organizationId,
    name: t.name,
    sector: t.sector,
    clientType: t.clientType,
    enabledModules: t.enabledModules,
  });
}

interface PlatformContextValue {
  tenants: PlatformTenant[];
  plans: SubscriptionPlan[];
  demoRequests: DemoRequest[];
  orgAdminAssignments: OrgAdminAssignment[];
  updateTenantStatus: (id: string, status: TenantStatus) => void;
  updateTenantClientType: (id: string, clientType: OrgClientType) => void;
  updateTenantModules: (
    id: string,
    modules: Partial<OrgEnabledModules>,
  ) => void;
  updateDemoRequestStatus: (id: string, status: DemoRequestStatus) => void;
  togglePlanActive: (id: string) => void;
  updatePlan: (id: TenantPlanId, patch: Partial<SubscriptionPlan>) => void;
  createOrganization: (input: {
    name: string;
    sector: string;
    planId: TenantPlanId;
    seats: number;
    clientType?: OrgClientType;
  }) => Promise<{ ok: boolean; tenant?: PlatformTenant; reason?: string }>;
  assignOrgAdmin: (input: {
    tenantId: string;
    name: string;
    email: string;
  }) => Promise<{ ok: boolean; reason?: string }>;
  resetPlatformDemo: () => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  applyDemoDataMigration();

  const [tenants, setTenants] = useState<PlatformTenant[]>(() =>
    migrateTenants(loadJson(PLATFORM_LS.tenants, SEED_TENANTS)),
  );
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() =>
    migratePlans(loadJson(PLATFORM_LS.plans, SEED_PLANS)),
  );
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>(() =>
    loadJson(PLATFORM_LS.demoRequests, SEED_DEMO_REQUESTS),
  );
  const [orgAdminAssignments, setOrgAdminAssignments] = useState<
    OrgAdminAssignment[]
  >(() => loadJson(ADMIN_LS.orgAdmins, []));

  useEffect(() => saveJson(PLATFORM_LS.tenants, tenants), [tenants]);
  useEffect(() => saveJson(PLATFORM_LS.plans, plans), [plans]);
  useEffect(() => saveJson(PLATFORM_LS.demoRequests, demoRequests), [demoRequests]);
  useEffect(
    () => saveJson(ADMIN_LS.orgAdmins, orgAdminAssignments),
    [orgAdminAssignments],
  );

  const value = useMemo<PlatformContextValue>(
    () => ({
      tenants,
      plans,
      demoRequests,
      orgAdminAssignments,
      updateTenantStatus: (id, status) =>
        setTenants((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status } : t)),
        ),
      updateTenantClientType: (id, clientType) =>
        setTenants((prev) =>
          prev.map((t) => {
            if (t.id !== id) return t;
            const next: PlatformTenant = {
              ...t,
              clientType,
              enabledModules: modulesForClientType(clientType),
            };
            pushToCore(next);
            return next;
          }),
        ),
      updateTenantModules: (id, modules) =>
        setTenants((prev) =>
          prev.map((t) => {
            if (t.id !== id) return t;
            const next: PlatformTenant = {
              ...t,
              enabledModules: normalizeOrgModules({
                ...t.enabledModules,
                ...modules,
              }),
            };
            pushToCore(next);
            return next;
          }),
        ),
      updateDemoRequestStatus: (id, status) =>
        setDemoRequests((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status } : d)),
        ),
      togglePlanActive: (id) =>
        setPlans((prev) =>
          prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
        ),
      updatePlan: (id, patch) =>
        setPlans((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const next = { ...p, ...patch };
            if (patch.enabledModules) {
              next.enabledModules = normalizeOrgModules(patch.enabledModules);
            }
            return next;
          }),
        ),
      createOrganization: async (input) => {
        await demoDelay();
        if (!input.name.trim()) {
          return { ok: false, reason: "اسم المنشأة مطلوب." };
        }
        const plan = plans.find((p) => p.id === input.planId);
        const organizationId = `org-${crypto.randomUUID().slice(0, 8)}`;
        const clientType =
          input.clientType || plan?.clientType || "small";
        const tenant: PlatformTenant = {
          id: `t-${crypto.randomUUID().slice(0, 8)}`,
          name: input.name.trim(),
          sector: input.sector.trim() || "قطاع خاص",
          planId: input.planId,
          status: "trial",
          seats: input.seats || plan?.seatsIncluded || 25,
          usedSeats: 1,
          createdAt: new Date().toISOString(),
          organizationId,
          clientType,
          enabledModules: normalizeOrgModules(
            plan?.enabledModules ?? modulesForClientType(clientType),
          ),
        };
        pushToCore(tenant);
        setTenants((prev) => [tenant, ...prev]);
        return { ok: true, tenant };
      },
      assignOrgAdmin: async (input) => {
        await demoDelay();
        const tenant = tenants.find((t) => t.id === input.tenantId);
        if (!tenant) return { ok: false, reason: "المستأجر غير موجود." };
        if (!input.email.includes("@") || !input.name.trim()) {
          return { ok: false, reason: "اسم وبريد مسؤول المؤسسة مطلوبان." };
        }
        const organizationId =
          tenant.organizationId || `org-${crypto.randomUUID().slice(0, 8)}`;
        setTenants((prev) =>
          prev.map((t) =>
            t.id === input.tenantId
              ? {
                  ...t,
                  organizationId,
                  orgAdminEmail: input.email.trim(),
                  orgAdminName: input.name.trim(),
                }
              : t,
          ),
        );
        const row: OrgAdminAssignment = {
          id: crypto.randomUUID(),
          tenantId: input.tenantId,
          organizationId,
          email: input.email.trim(),
          name: input.name.trim(),
          assignedAt: new Date().toISOString(),
        };
        setOrgAdminAssignments((prev) => [row, ...prev]);
        return { ok: true };
      },
      resetPlatformDemo: () => {
        setTenants(SEED_TENANTS);
        setPlans(SEED_PLANS);
        setDemoRequests(SEED_DEMO_REQUESTS);
        setOrgAdminAssignments([]);
      },
    }),
    [tenants, plans, demoRequests, orgAdminAssignments],
  );

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}
