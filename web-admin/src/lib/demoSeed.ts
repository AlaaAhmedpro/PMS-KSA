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
} from "./saasSeed";

export const DEMO_DATA_VERSION = 20261102.3;
export const LS_DEMO_VERSION = "pms_admin_demo_version";

export const PLATFORM_LS = {
  tenants: "pms_admin_tenants_v2",
  plans: "pms_admin_plans_v2",
  demoRequests: "pms_admin_demo_requests_v1",
  subscriptions: "pms_admin_subscriptions_v1",
  invoices: "pms_admin_invoices_v1",
  leads: "pms_admin_leads_v1",
  tickets: "pms_admin_tickets_v1",
  invites: "pms_admin_invites_v1",
  loginHistory: "pms_admin_login_history_v1",
  audit: "pms_admin_audit_v1",
  monitoring: "pms_admin_monitoring_v1",
  settings: "pms_admin_settings_v1",
  orgUsers: "pms_admin_org_users_v1",
  supportSessions: "pms_admin_support_sessions_v1",
  savedOrgViews: "pms_admin_org_saved_views_v1",
} as const;

export function applyDemoDataMigration() {
  try {
    if (localStorage.getItem(LS_DEMO_VERSION) === String(DEMO_DATA_VERSION)) return;
    localStorage.setItem(LS_DEMO_VERSION, String(DEMO_DATA_VERSION));
    localStorage.setItem(PLATFORM_LS.tenants, JSON.stringify(SEED_ORGANIZATIONS));
    localStorage.setItem(PLATFORM_LS.plans, JSON.stringify(SEED_SAAS_PLANS));
    localStorage.setItem(PLATFORM_LS.subscriptions, JSON.stringify(SEED_SUBSCRIPTIONS));
    localStorage.setItem(PLATFORM_LS.invoices, JSON.stringify(SEED_INVOICES));
    localStorage.setItem(PLATFORM_LS.leads, JSON.stringify(SEED_LEADS));
    localStorage.setItem(PLATFORM_LS.tickets, JSON.stringify(SEED_TICKETS));
    localStorage.setItem(PLATFORM_LS.invites, JSON.stringify(SEED_INVITES));
    localStorage.setItem(PLATFORM_LS.loginHistory, JSON.stringify(SEED_LOGIN_HISTORY));
    localStorage.setItem(PLATFORM_LS.audit, JSON.stringify(SEED_AUDIT));
    localStorage.setItem(PLATFORM_LS.monitoring, JSON.stringify(SEED_MONITORING));
    localStorage.setItem(PLATFORM_LS.settings, JSON.stringify(SEED_SETTINGS));
    localStorage.setItem(PLATFORM_LS.orgUsers, JSON.stringify(SEED_ORG_USERS));
    localStorage.setItem(PLATFORM_LS.supportSessions, JSON.stringify([]));
  } catch {
    /* ignore quota */
  }
}
