import { ENTITIES, SEED_NEWS, SEED_NOTIFICATIONS, SEED_RECORDS } from "./mockData";
import { SEED_BRANCHES, SEED_CATEGORIES, SEED_DEPARTMENTS } from "./constants";
import {
  SEED_DEMO_REQUESTS,
  SEED_PLANS,
  SEED_TENANTS,
} from "./platformSeed";

/** زِد الرقم عند تحديث بيانات العرض التجريبي لإعادة تحميلها للجميع */
export const DEMO_DATA_VERSION = 20261101;
export const LS_DEMO_VERSION = "pms_demo_version";

const LS_RECORDS = "pms_records_v1";
const LS_NEWS = "pms_news_v1";
const LS_ENTITIES = "pms_entities_v1";
const LS_BRANCHES = "pms_branches_v1";
const LS_DEPARTMENTS = "pms_departments_v1";
const LS_CATEGORIES = "pms_categories_v1";
const LS_NOTIFICATIONS = "pms_notifications_v1";
const LS_TENANTS = "pms_tenants_v1";
const LS_PLANS = "pms_plans_v1";
const LS_DEMO_REQUESTS = "pms_demo_requests_v1";

export function applyDemoDataMigration() {
  try {
    if (localStorage.getItem(LS_DEMO_VERSION) === String(DEMO_DATA_VERSION)) return;
    localStorage.setItem(LS_DEMO_VERSION, String(DEMO_DATA_VERSION));
    localStorage.setItem(LS_RECORDS, JSON.stringify(SEED_RECORDS));
    localStorage.setItem(LS_NEWS, JSON.stringify(SEED_NEWS));
    localStorage.setItem(LS_ENTITIES, JSON.stringify(ENTITIES));
    localStorage.setItem(LS_BRANCHES, JSON.stringify(SEED_BRANCHES));
    localStorage.setItem(LS_DEPARTMENTS, JSON.stringify(SEED_DEPARTMENTS));
    localStorage.setItem(LS_CATEGORIES, JSON.stringify(SEED_CATEGORIES));
    localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
    localStorage.setItem(LS_TENANTS, JSON.stringify(SEED_TENANTS));
    localStorage.setItem(LS_PLANS, JSON.stringify(SEED_PLANS));
    localStorage.setItem(LS_DEMO_REQUESTS, JSON.stringify(SEED_DEMO_REQUESTS));
  } catch {
    /* ignore quota */
  }
}
