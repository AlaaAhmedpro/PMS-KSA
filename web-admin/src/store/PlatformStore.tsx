import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyDemoDataMigration, PLATFORM_LS } from "../lib/demoSeed";
import {
  SEED_AUDIT,
  SEED_INVOICES,
  SEED_INVITES,
  SEED_LEADS,
  SEED_LOGIN_HISTORY,
  SEED_MONITORING,
  SEED_ORGANIZATIONS,
  SEED_SAAS_PLANS,
  SEED_SETTINGS,
  SEED_SUBSCRIPTIONS,
  SEED_TICKETS,
  SEED_ORG_USERS,
} from "../lib/saasSeed";
import type {
  AuditEvent,
  Invoice,
  Lead,
  LeadStatus,
  LimitOverrides,
  LoginHistoryEntry,
  MonitoringSnapshot,
  OrganizationStatus,
  OrgSuspension,
  OrgTenantUser,
  PlatformInvite,
  PlatformOrganization,
  PlatformSettings,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  SupportAccessSession,
  SupportTicket,
  TicketPriority,
  TicketStatus,
  PlanEntitlements,
} from "../lib/platformDomain";
import {
  entitlementsToModules,
  formatSar,
} from "../lib/platformDomain";
import {
  canTransitionOrg,
  canTransitionSub,
  migrateLegacySubStatus,
  normalizeOrganization,
} from "../lib/orgLifecycle";
import type { OrgClientType, OrgEnabledModules } from "../lib/types";
import {
  modulesForClientType,
  normalizeOrgModules,
  syncTenantModulesToCore,
} from "../lib/orgModules";
import { loadJson, saveJson } from "../demo-mode/storage";
import { demoDelay } from "../demo-mode/config";
import { useAuth } from "./AuthContext";

function pushOrg(o: PlatformOrganization) {
  if (!o.organizationId) return;
  syncTenantModulesToCore({
    organizationId: o.organizationId,
    name: o.name,
    sector: o.sector,
    city: o.city,
    clientType: o.clientType,
    enabledModules: o.enabledModules,
    active: o.status === "active",
    suspended: o.status === "suspended" || o.status === "archived",
  });
}

interface PlatformContextValue {
  organizations: PlatformOrganization[];
  /** alias */
  tenants: PlatformOrganization[];
  plans: SubscriptionPlan[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  leads: Lead[];
  tickets: SupportTicket[];
  invites: PlatformInvite[];
  loginHistory: LoginHistoryEntry[];
  auditEvents: AuditEvent[];
  monitoring: MonitoringSnapshot;
  settings: PlatformSettings;
  /** legacy */
  demoRequests: Lead[];
  orgAdminAssignments: never[];

  logAudit: (partial: Omit<AuditEvent, "id" | "at" | "actorId" | "actorName" | "ip"> & { ip?: string }) => void;

  updateOrganizationStatus: (id: string, status: OrganizationStatus) => void;
  updateOrganization: (id: string, patch: Partial<PlatformOrganization>) => void;
  updateTenantStatus: (id: string, status: OrganizationStatus) => void;
  updateTenantClientType: (id: string, clientType: OrgClientType) => void;
  updateTenantModules: (id: string, modules: Partial<OrgEnabledModules>) => void;
  changeOrganizationPlan: (id: string, planId: string) => void;
  extendTrial: (id: string, days: number) => void;

  createOrganization: (input: {
    name: string;
    sector: string;
    industry?: string;
    city?: string;
    planId: string;
    seats: number;
    clientType?: OrgClientType;
    customerKind?: PlatformOrganization["customerKind"];
  }) => Promise<{ ok: boolean; tenant?: PlatformOrganization; reason?: string }>;

  assignOrgAdmin: (input: {
    tenantId: string;
    name: string;
    email: string;
  }) => Promise<{ ok: boolean; reason?: string }>;

  upsertPlan: (plan: SubscriptionPlan) => void;
  updatePlan: (id: string, patch: Partial<SubscriptionPlan>) => void;
  togglePlanActive: (id: string) => void;

  updateLeadStatus: (id: string, status: LeadStatus) => void;
  updateDemoRequestStatus: (id: string, status: LeadStatus) => void;
  convertLeadToOrganization: (leadId: string) => Promise<{ ok: boolean; orgId?: string; reason?: string }>;

  updateTicketStatus: (id: string, status: TicketStatus) => void;
  updateTicketPriority: (id: string, priority: TicketPriority) => void;
  assignTicket: (id: string, assigneeName: string) => void;
  replyTicket: (id: string, text: string) => void;

  updateInvoiceStatus: (id: string, status: Invoice["status"]) => void;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  setFeatureFlag: (key: string, value: boolean) => void;

  invitePlatformUser: (input: { name: string; email: string; role: PlatformInvite["role"] }) => void;
  revokeInvite: (id: string) => void;

  orgUsers: OrgTenantUser[];
  supportSessions: SupportAccessSession[];
  suspendOrganization: (
    id: string,
    suspension: OrgSuspension,
  ) => { ok: boolean; reason?: string };
  reactivateOrganization: (id: string) => { ok: boolean; reason?: string };
  archiveOrganization: (id: string, reason: string) => { ok: boolean; reason?: string };
  updateSubscriptionStatus: (
    organizationId: string,
    status: SubscriptionStatus,
  ) => { ok: boolean; reason?: string };
  setLimitOverrides: (
    id: string,
    overrides: LimitOverrides,
  ) => void;
  startSupportAccess: (input: {
    organizationId: string;
    reason: string;
    minutes: number;
    readOnly: boolean;
  }) => SupportAccessSession | null;
  endSupportAccess: (sessionId: string) => void;
  onboardOrganization: (input: {
    org: Omit<
      PlatformOrganization,
      | "id"
      | "status"
      | "provisioningStatus"
      | "usage"
      | "createdAt"
      | "enabledModules"
      | "organizationId"
      | "seats"
    > & { seats?: number; enabledModules?: OrgEnabledModules };
    subscriptionMode: "trial" | "paid";
    billingCycle: "monthly" | "annual";
    admin: { name: string; email: string; phone?: string; jobTitle?: string };
    sendInvite: boolean;
  }) => Promise<{ ok: boolean; orgId?: string; reason?: string }>;

  resetPlatformDemo: () => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  applyDemoDataMigration();
  const { user } = useAuth();

  const [organizations, setOrganizations] = useState<PlatformOrganization[]>(() =>
    loadJson(PLATFORM_LS.tenants, SEED_ORGANIZATIONS).map(normalizeOrganization),
  );
  const [orgUsers, setOrgUsers] = useState<OrgTenantUser[]>(() =>
    loadJson(PLATFORM_LS.orgUsers, SEED_ORG_USERS),
  );
  const [supportSessions, setSupportSessions] = useState<SupportAccessSession[]>(
    () => loadJson(PLATFORM_LS.supportSessions, []),
  );
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() =>
    loadJson(PLATFORM_LS.plans, SEED_SAAS_PLANS),
  );
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() =>
    loadJson(PLATFORM_LS.subscriptions, SEED_SUBSCRIPTIONS).map((s) => ({
      ...s,
      status: migrateLegacySubStatus(String(s.status)),
    })),
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    loadJson(PLATFORM_LS.invoices, SEED_INVOICES),
  );
  const [leads, setLeads] = useState<Lead[]>(() =>
    loadJson(PLATFORM_LS.leads, SEED_LEADS),
  );
  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    loadJson(PLATFORM_LS.tickets, SEED_TICKETS),
  );
  const [invites, setInvites] = useState<PlatformInvite[]>(() =>
    loadJson(PLATFORM_LS.invites, SEED_INVITES),
  );
  const [loginHistory] = useState<LoginHistoryEntry[]>(() =>
    loadJson(PLATFORM_LS.loginHistory, SEED_LOGIN_HISTORY),
  );
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() =>
    loadJson(PLATFORM_LS.audit, SEED_AUDIT),
  );
  const [monitoring] = useState<MonitoringSnapshot>(() =>
    loadJson(PLATFORM_LS.monitoring, SEED_MONITORING),
  );
  const [settings, setSettings] = useState<PlatformSettings>(() =>
    loadJson(PLATFORM_LS.settings, SEED_SETTINGS),
  );

  useEffect(() => saveJson(PLATFORM_LS.tenants, organizations), [organizations]);
  /** Keep core login bridge aligned with org lifecycle (suspended | archived). */
  useEffect(() => {
    organizations.forEach(pushOrg);
  }, [organizations]);
  useEffect(() => saveJson(PLATFORM_LS.orgUsers, orgUsers), [orgUsers]);
  useEffect(
    () => saveJson(PLATFORM_LS.supportSessions, supportSessions),
    [supportSessions],
  );
  useEffect(() => saveJson(PLATFORM_LS.plans, plans), [plans]);
  useEffect(() => saveJson(PLATFORM_LS.subscriptions, subscriptions), [subscriptions]);
  useEffect(() => saveJson(PLATFORM_LS.invoices, invoices), [invoices]);
  useEffect(() => saveJson(PLATFORM_LS.leads, leads), [leads]);
  useEffect(() => saveJson(PLATFORM_LS.tickets, tickets), [tickets]);
  useEffect(() => saveJson(PLATFORM_LS.invites, invites), [invites]);
  useEffect(() => saveJson(PLATFORM_LS.audit, auditEvents), [auditEvents]);
  useEffect(() => saveJson(PLATFORM_LS.settings, settings), [settings]);

  const logAudit = useCallback(
    (
      partial: Omit<AuditEvent, "id" | "at" | "actorId" | "actorName" | "ip"> & {
        ip?: string;
      },
    ) => {
      const ev: AuditEvent = {
        id: `au-${crypto.randomUUID().slice(0, 8)}`,
        at: new Date().toISOString(),
        actorId: user?.id || "system",
        actorName: user?.name || "النظام",
        ip: partial.ip || "127.0.0.1",
        ...partial,
      };
      setAuditEvents((prev) => [ev, ...prev].slice(0, 500));
    },
    [user],
  );

  const value = useMemo<PlatformContextValue>(() => {
    const updateOrganizationStatus = (id: string, status: OrganizationStatus) => {
      setOrganizations((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          if (!canTransitionOrg(o.status, status)) {
            logAudit({
              action: `organization.status.${status}`,
              targetType: "organization",
              targetId: id,
              organizationId: id,
              before: o.status,
              after: status,
              result: "denied",
            });
            return o;
          }
          const next = { ...o, status };
          pushOrg(next);
          logAudit({
            action: `organization.status.${status}`,
            targetType: "organization",
            targetId: id,
            organizationId: id,
            before: o.status,
            after: status,
            result: "success",
          });
          return next;
        }),
      );
    };

    return {
      organizations,
      tenants: organizations,
      plans,
      subscriptions,
      invoices,
      leads,
      tickets,
      invites,
      loginHistory,
      auditEvents,
      monitoring,
      settings,
      demoRequests: leads,
      orgAdminAssignments: [],
      logAudit,

      updateOrganizationStatus,
      updateTenantStatus: updateOrganizationStatus,

      updateOrganization: (id, patch) =>
        setOrganizations((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const next = { ...o, ...patch };
            if (patch.enabledModules) {
              next.enabledModules = normalizeOrgModules(patch.enabledModules);
            }
            pushOrg(next);
            logAudit({
              action: "organization.update",
              targetType: "organization",
              targetId: id,
              organizationId: id,
              result: "success",
            });
            return next;
          }),
        ),

      updateTenantClientType: (id, clientType) =>
        setOrganizations((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const next: PlatformOrganization = {
              ...o,
              clientType,
              enabledModules: modulesForClientType(clientType),
            };
            pushOrg(next);
            return next;
          }),
        ),

      updateTenantModules: (id, modules) =>
        setOrganizations((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const next: PlatformOrganization = {
              ...o,
              enabledModules: normalizeOrgModules({
                ...o.enabledModules,
                ...modules,
              }),
            };
            pushOrg(next);
            logAudit({
              action: "organization.modules",
              targetType: "organization",
              targetId: id,
              organizationId: id,
              result: "success",
            });
            return next;
          }),
        ),

      changeOrganizationPlan: (id, planId) => {
        const plan = plans.find((p) => p.id === planId);
        if (!plan) return;
        setOrganizations((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const next: PlatformOrganization = {
              ...o,
              planId,
              clientType: plan.clientType,
              seats: plan.seatsIncluded,
              enabledModules: normalizeOrgModules(plan.enabledModules),
            };
            pushOrg(next);
            return next;
          }),
        );
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.organizationId === id
              ? {
                  ...s,
                  planId,
                  mrrSar: plan.priceMonthly,
                  history: [
                    {
                      at: new Date().toISOString(),
                      text: `تغيير الخطة إلى ${plan.name}`,
                    },
                    ...s.history,
                  ],
                }
              : s,
          ),
        );
        logAudit({
          action: "organization.change_plan",
          targetType: "organization",
          targetId: id,
          organizationId: id,
          after: planId,
          result: "success",
        });
      },

      extendTrial: (id, days) => {
        setOrganizations((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const base = o.trialEndsAt ? new Date(o.trialEndsAt) : new Date();
            base.setDate(base.getDate() + days);
            const next = {
              ...o,
              trialEndsAt: base.toISOString(),
            };
            pushOrg(next);
            return next;
          }),
        );
        setSubscriptions((prev) =>
          prev.map((s) => {
            if (s.organizationId !== id) return s;
            const base = new Date(s.renewAt);
            base.setDate(base.getDate() + days);
            return {
              ...s,
              status: s.status === "expired" ? "trial" : s.status === "active" ? "trial" : s.status,
              renewAt: base.toISOString(),
              history: [
                {
                  at: new Date().toISOString(),
                  text: `تمديد الفترة التجريبية ${days} يوماً`,
                },
                ...s.history,
              ],
            };
          }),
        );
        logAudit({
          action: "organization.extend_trial",
          targetType: "organization",
          targetId: id,
          organizationId: id,
          after: String(days),
          result: "success",
        });
      },

      createOrganization: async (input) => {
        await demoDelay();
        if (!input.name.trim()) {
          return { ok: false, reason: "اسم المنشأة مطلوب." };
        }
        const plan = plans.find((p) => p.id === input.planId) || plans[0];
        const organizationId = `org-${crypto.randomUUID().slice(0, 8)}`;
        const clientType = input.clientType || plan.clientType;
        const org = normalizeOrganization({
          id: `t-${crypto.randomUUID().slice(0, 8)}`,
          name: input.name.trim(),
          legalName: input.name.trim(),
          logoInitials: input.name.trim().slice(0, 2),
          sector: input.sector.trim() || "قطاع خاص",
          industry: input.industry || input.sector || "عام",
          country: "السعودية",
          city: input.city || "الرياض",
          customerKind:
            input.customerKind ||
            (clientType === "government"
              ? "government"
              : clientType === "enterprise"
                ? "enterprise"
                : "standard"),
          clientType,
          deploymentType: clientType === "government" ? "dedicated" : "shared",
          planId: plan.id,
          status: "active",
          provisioningStatus: "succeeded",
          seats: input.seats || plan.seatsIncluded,
          usage: { users: 1, projects: 0, storageGb: 0.1, apiRequests: 0 },
          createdAt: new Date().toISOString(),
          trialEndsAt: new Date(
            Date.now() + (plan.trialDays || 14) * 86400000,
          ).toISOString(),
          organizationId,
          enabledModules: normalizeOrgModules(plan.enabledModules),
        });
        pushOrg(org);
        setOrganizations((prev) => [org, ...prev]);
        setSubscriptions((prev) => [
          {
            id: `sub-${org.id}`,
            organizationId: org.id,
            planId: plan.id,
            status: "trial",
            billingCycle: plan.billingCycleDefault,
            startAt: org.createdAt,
            renewAt: org.trialEndsAt!,
            mrrSar: plan.priceMonthly,
            history: [
              {
                at: org.createdAt,
                text: `اشتراك تجريبي — ${plan.name}`,
              },
            ],
          },
          ...prev,
        ]);
        logAudit({
          action: "organization.create",
          targetType: "organization",
          targetId: org.id,
          organizationId: org.id,
          result: "success",
        });
        return { ok: true, tenant: org };
      },

      assignOrgAdmin: async (input) => {
        await demoDelay();
        const tenant = organizations.find((t) => t.id === input.tenantId);
        if (!tenant) return { ok: false, reason: "المنشأة غير موجودة." };
        if (!input.email.includes("@") || !input.name.trim()) {
          return { ok: false, reason: "اسم وبريد مسؤول المؤسسة مطلوبان." };
        }
        const organizationId =
          tenant.organizationId || `org-${crypto.randomUUID().slice(0, 8)}`;
        setOrganizations((prev) =>
          prev.map((t) => {
            if (t.id !== input.tenantId) return t;
            const next = {
              ...t,
              organizationId,
              orgAdminEmail: input.email.trim(),
              orgAdminName: input.name.trim(),
            };
            pushOrg(next);
            return next;
          }),
        );
        logAudit({
          action: "organization.assign_admin",
          targetType: "organization",
          targetId: input.tenantId,
          organizationId: input.tenantId,
          after: input.email,
          result: "success",
        });
        return { ok: true };
      },

      upsertPlan: (plan) => {
        setPlans((prev) => {
          const i = prev.findIndex((p) => p.id === plan.id);
          const nextPlan = {
            ...plan,
            enabledModules: normalizeOrgModules(
              plan.enabledModules ||
                entitlementsToModules(plan.entitlements as PlanEntitlements),
            ),
          };
          if (i >= 0) {
            const copy = [...prev];
            copy[i] = nextPlan;
            return copy;
          }
          return [nextPlan, ...prev];
        });
        logAudit({
          action: "plan.upsert",
          targetType: "plan",
          targetId: plan.id,
          result: "success",
        });
      },

      updatePlan: (id, patch) =>
        setPlans((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const next = { ...p, ...patch };
            if (patch.entitlements) {
              next.enabledModules = entitlementsToModules(
                patch.entitlements as PlanEntitlements,
              );
            }
            if (patch.enabledModules) {
              next.enabledModules = normalizeOrgModules(patch.enabledModules);
            }
            return next;
          }),
        ),

      togglePlanActive: (id) =>
        setPlans((prev) =>
          prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
        ),

      updateLeadStatus: (id, status) =>
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status } : l)),
        ),
      updateDemoRequestStatus: (id, status) =>
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status } : l)),
        ),

      convertLeadToOrganization: async (leadId) => {
        await demoDelay();
        const lead = leads.find((l) => l.id === leadId);
        if (!lead) return { ok: false, reason: "الفرصة غير موجودة." };
        const planId = lead.interestedPlanId || "starter";
        const plan = plans.find((p) => p.id === planId) || plans[1];
        const organizationId = `org-${crypto.randomUUID().slice(0, 8)}`;
        const org = normalizeOrganization({
          id: `t-${crypto.randomUUID().slice(0, 8)}`,
          name: lead.companyName,
          legalName: lead.companyName,
          logoInitials: lead.companyName.slice(0, 2),
          sector: lead.industry,
          industry: lead.industry,
          country: "السعودية",
          city: "الرياض",
          customerKind: lead.customerType,
          clientType: plan.clientType,
          deploymentType:
            lead.customerType === "government" ? "dedicated" : "shared",
          planId: plan.id,
          status: "active",
          provisioningStatus: "succeeded",
          seats: plan.seatsIncluded,
          usage: { users: 1, projects: 0, storageGb: 0.1, apiRequests: 0 },
          createdAt: new Date().toISOString(),
          trialEndsAt: new Date(
            Date.now() + (plan.trialDays || 14) * 86400000,
          ).toISOString(),
          organizationId,
          orgAdminEmail: lead.email,
          orgAdminName: lead.contactName,
          enabledModules: normalizeOrgModules(plan.enabledModules),
        });
        pushOrg(org);
        setOrganizations((prev) => [org, ...prev]);
        setSubscriptions((prev) => [
          {
            id: `sub-${org.id}`,
            organizationId: org.id,
            planId: plan.id,
            status: "trial",
            billingCycle: plan.billingCycleDefault,
            startAt: org.createdAt,
            renewAt: org.trialEndsAt!,
            mrrSar: plan.priceMonthly,
            history: [
              {
                at: org.createdAt,
                text: `تحويل فرصة إلى اشتراك تجريبي — ${plan.name}`,
              },
            ],
          },
          ...prev,
        ]);
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: "won" } : l)),
        );
        logAudit({
          action: "lead.convert",
          targetType: "lead",
          targetId: leadId,
          organizationId: org.id,
          result: "success",
        });
        return { ok: true, orgId: org.id };
      },

      updateTicketStatus: (id, status) =>
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, status, updatedAt: new Date().toISOString() }
              : t,
          ),
        ),
      updateTicketPriority: (id, priority) =>
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, priority, updatedAt: new Date().toISOString() }
              : t,
          ),
        ),
      assignTicket: (id, assigneeName) =>
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, assigneeName, updatedAt: new Date().toISOString() }
              : t,
          ),
        ),
      replyTicket: (id, text) => {
        if (!text.trim()) return;
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  updatedAt: new Date().toISOString(),
                  status:
                    t.status === "open" ? "in_progress" : t.status,
                  messages: [
                    ...t.messages,
                    {
                      id: `m-${crypto.randomUUID().slice(0, 6)}`,
                      at: new Date().toISOString(),
                      authorName: user?.name || "وكيل الدعم",
                      authorKind: "agent" as const,
                      text: text.trim(),
                    },
                  ],
                }
              : t,
          ),
        );
      },

      updateInvoiceStatus: (id, status) => {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === id
              ? {
                  ...inv,
                  status,
                  paidAt:
                    status === "paid"
                      ? new Date().toISOString()
                      : inv.paidAt,
                }
              : inv,
          ),
        );
        logAudit({
          action: `invoice.${status}`,
          targetType: "invoice",
          targetId: id,
          result: "success",
        });
      },

      updateSettings: (patch) => {
        setSettings((prev) => ({ ...prev, ...patch }));
        logAudit({
          action: "settings.update",
          targetType: "settings",
          targetId: "platform",
          result: "success",
        });
      },

      setFeatureFlag: (key, value) =>
        setSettings((prev) => ({
          ...prev,
          featureFlags: { ...prev.featureFlags, [key]: value },
        })),

      invitePlatformUser: (input) => {
        setInvites((prev) => [
          {
            id: `inv-${crypto.randomUUID().slice(0, 6)}`,
            email: input.email,
            name: input.name,
            role: input.role,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        logAudit({
          action: "platform_user.invite",
          targetType: "invite",
          targetId: input.email,
          after: input.role,
          result: "success",
        });
      },

      revokeInvite: (id) =>
        setInvites((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, status: "revoked" as const } : i,
          ),
        ),

      orgUsers,
      supportSessions,

      suspendOrganization: (id, suspension) => {
        const o = organizations.find((x) => x.id === id);
        if (!o) return { ok: false, reason: "المنشأة غير موجودة." };
        if (!canTransitionOrg(o.status, "suspended")) {
          return { ok: false, reason: "لا يمكن تعليق المنشأة من حالتها الحالية." };
        }
        const next = normalizeOrganization({
          ...o,
          status: "suspended",
          suspension,
        });
        setOrganizations((prev) => prev.map((x) => (x.id === id ? next : x)));
        pushOrg(next);
        logAudit({
          action: "organization.suspend",
          targetType: "organization",
          targetId: id,
          organizationId: id,
          after: suspension.reason,
          result: "success",
        });
        return { ok: true };
      },

      reactivateOrganization: (id) => {
        const o = organizations.find((x) => x.id === id);
        if (!o) return { ok: false, reason: "المنشأة غير موجودة." };
        if (!canTransitionOrg(o.status, "active")) {
          return { ok: false, reason: "لا يمكن إعادة التفعيل من الحالة الحالية." };
        }
        const sub = subscriptions.find((s) => s.organizationId === id);
        if (sub?.status === "past_due") {
          return {
            ok: false,
            reason: "يوجد اشتراك متأخر السداد. عالج الفوترة أولاً.",
          };
        }
        const next = normalizeOrganization({
          ...o,
          status: "active",
          suspension: undefined,
        });
        setOrganizations((prev) => prev.map((x) => (x.id === id ? next : x)));
        pushOrg(next);
        logAudit({
          action: "organization.reactivate",
          targetType: "organization",
          targetId: id,
          organizationId: id,
          result: "success",
        });
        return { ok: true };
      },

      archiveOrganization: (id, reason) => {
        const o = organizations.find((x) => x.id === id);
        if (!o) return { ok: false, reason: "المنشأة غير موجودة." };
        if (!canTransitionOrg(o.status, "archived")) {
          return { ok: false, reason: "لا يمكن أرشفة المنشأة من حالتها الحالية." };
        }
        const next = normalizeOrganization({
          ...o,
          status: "archived",
          notes: reason,
        });
        setOrganizations((prev) => prev.map((x) => (x.id === id ? next : x)));
        pushOrg(next);
        logAudit({
          action: "organization.archive",
          targetType: "organization",
          targetId: id,
          organizationId: id,
          after: reason,
          result: "success",
        });
        return { ok: true };
      },

      updateSubscriptionStatus: (organizationId, status) => {
        const sub = subscriptions.find((s) => s.organizationId === organizationId);
        if (!sub) return { ok: false, reason: "الاشتراك غير موجود." };
        if (!canTransitionSub(sub.status, status)) {
          return { ok: false, reason: "انتقال حالة الاشتراك غير مسموح." };
        }
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.organizationId === organizationId
              ? {
                  ...s,
                  status,
                  history: [
                    {
                      at: new Date().toISOString(),
                      text: `تغيير حالة الاشتراك إلى ${status}`,
                    },
                    ...s.history,
                  ],
                }
              : s,
          ),
        );
        return { ok: true };
      },

      setLimitOverrides: (id, overrides) => {
        setOrganizations((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  limitOverrides: {
                    ...overrides,
                    at: new Date().toISOString(),
                  },
                }
              : o,
          ),
        );
        logAudit({
          action: "organization.limits_override",
          targetType: "organization",
          targetId: id,
          organizationId: id,
          after: overrides.reason || JSON.stringify(overrides),
          result: "success",
        });
      },

      startSupportAccess: (input) => {
        if (!input.reason.trim()) return null;
        const session: SupportAccessSession = {
          id: `sa-${crypto.randomUUID().slice(0, 8)}`,
          organizationId: input.organizationId,
          actorId: user?.id || "system",
          actorName: user?.name || "النظام",
          reason: input.reason.trim(),
          readOnly: input.readOnly,
          startedAt: new Date().toISOString(),
          endsAt: new Date(
            Date.now() + input.minutes * 60_000,
          ).toISOString(),
        };
        setSupportSessions((prev) => [session, ...prev]);
        logAudit({
          action: "support_access.start",
          targetType: "organization",
          targetId: input.organizationId,
          organizationId: input.organizationId,
          after: input.reason,
          result: "success",
        });
        return session;
      },

      endSupportAccess: (sessionId) => {
        setSupportSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, endedAt: new Date().toISOString() }
              : s,
          ),
        );
      },

      onboardOrganization: async (input) => {
        await demoDelay();
        if (!input.org.name?.trim()) {
          return { ok: false, reason: "اسم المنشأة مطلوب." };
        }
        const dup = organizations.find(
          (o) =>
            o.name === input.org.name.trim() ||
            (input.org.crNumber && o.crNumber === input.org.crNumber),
        );
        if (dup) {
          return { ok: false, reason: "منشأة بنفس الاسم أو السجل التجاري موجودة." };
        }
        const plan =
          plans.find((p) => p.id === input.org.planId) || plans[0];
        const organizationId = `org-${crypto.randomUUID().slice(0, 8)}`;
        const id = `t-${crypto.randomUUID().slice(0, 8)}`;
        const createdAt = new Date().toISOString();
        let org: PlatformOrganization = normalizeOrganization({
          ...input.org,
          id,
          name: input.org.name.trim(),
          logoInitials: input.org.name.trim().slice(0, 2),
          status: "provisioning",
          provisioningStatus: "running",
          seats: input.org.seats || plan.seatsIncluded,
          usage: { users: 1, projects: 0, storageGb: 0.1, apiRequests: 0 },
          createdAt,
          organizationId,
          enabledModules: normalizeOrgModules(
            input.org.enabledModules || plan.enabledModules,
          ),
          orgAdminEmail: input.admin.email,
          orgAdminName: input.admin.name,
          trialEndsAt:
            input.subscriptionMode === "trial"
              ? new Date(
                  Date.now() + (plan.trialDays || 14) * 86400000,
                ).toISOString()
              : undefined,
          renewalAt:
            input.subscriptionMode === "paid"
              ? new Date(
                  Date.now() +
                    (input.billingCycle === "annual" ? 365 : 30) *
                      86400000,
                ).toISOString()
              : undefined,
        } as PlatformOrganization);

        setOrganizations((prev) => [org, ...prev]);
        setSubscriptions((prev) => [
          {
            id: `sub-${id}`,
            organizationId: id,
            planId: plan.id,
            status: input.subscriptionMode === "trial" ? "trial" : "active",
            billingCycle: input.billingCycle,
            startAt: createdAt,
            renewAt: org.renewalAt || org.trialEndsAt || createdAt,
            mrrSar: plan.priceMonthly,
            history: [
              {
                at: createdAt,
                text: `اشتراك ${input.subscriptionMode === "trial" ? "تجريبي" : "مدفوع"} — ${plan.name}`,
              },
            ],
          },
          ...prev,
        ]);
        setOrgUsers((prev) => [
          {
            id: `ou-${id}-admin`,
            organizationId: id,
            name: input.admin.name,
            email: input.admin.email,
            role: "org_admin",
            status: input.sendInvite ? "invited" : "active",
            jobTitle: input.admin.jobTitle || "مسؤول المؤسسة",
          },
          ...prev,
        ]);

        await new Promise((r) => setTimeout(r, 600));
        org = normalizeOrganization({
          ...org,
          status: "active",
          provisioningStatus: "succeeded",
        });
        setOrganizations((prev) => prev.map((x) => (x.id === id ? org : x)));
        pushOrg(org);
        logAudit({
          action: "organization.onboard",
          targetType: "organization",
          targetId: id,
          organizationId: id,
          result: "success",
        });
        return { ok: true, orgId: id };
      },

      resetPlatformDemo: () => {
        setOrganizations(SEED_ORGANIZATIONS);
        setPlans(SEED_SAAS_PLANS);
        setSubscriptions(SEED_SUBSCRIPTIONS);
        setInvoices(SEED_INVOICES);
        setLeads(SEED_LEADS);
        setTickets(SEED_TICKETS);
        setInvites(SEED_INVITES);
        setAuditEvents(SEED_AUDIT);
        setSettings(SEED_SETTINGS);
        setOrgUsers(SEED_ORG_USERS);
        setSupportSessions([]);
        SEED_ORGANIZATIONS.forEach(pushOrg);
      },
    };
  }, [
    organizations,
    orgUsers,
    supportSessions,
    plans,
    subscriptions,
    invoices,
    leads,
    tickets,
    invites,
    loginHistory,
    auditEvents,
    monitoring,
    settings,
    logAudit,
    user,
  ]);

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform outside provider");
  return ctx;
}

export { formatSar };
