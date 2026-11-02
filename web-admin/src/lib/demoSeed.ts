import {
  SEED_DEMO_REQUESTS,
  SEED_PLANS,
  SEED_TENANTS,
} from "./platformSeed";

export const DEMO_DATA_VERSION = 20261029;
export const LS_DEMO_VERSION = "pms_admin_demo_version";

const LS_TENANTS = "pms_admin_tenants_v1";
const LS_PLANS = "pms_admin_plans_v1";
const LS_DEMO_REQUESTS = "pms_admin_demo_requests_v1";

export function applyDemoDataMigration() {
  try {
    if (localStorage.getItem(LS_DEMO_VERSION) === String(DEMO_DATA_VERSION)) return;
    localStorage.setItem(LS_DEMO_VERSION, String(DEMO_DATA_VERSION));
    localStorage.setItem(LS_TENANTS, JSON.stringify(SEED_TENANTS));
    localStorage.setItem(LS_PLANS, JSON.stringify(SEED_PLANS));
    localStorage.setItem(LS_DEMO_REQUESTS, JSON.stringify(SEED_DEMO_REQUESTS));
  } catch {
    /* ignore quota */
  }
}

export const PLATFORM_LS = {
  tenants: LS_TENANTS,
  plans: LS_PLANS,
  demoRequests: LS_DEMO_REQUESTS,
};
