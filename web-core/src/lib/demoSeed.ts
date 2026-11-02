import { ENTITIES, SEED_NOTIFICATIONS, SEED_RECORDS } from "./mockData";
import { SEED_BRANCHES, SEED_CATEGORIES, SEED_DEPARTMENTS } from "./constants";

/** زِد الرقم عند تحديث بيانات العرض التجريبي لإعادة تحميلها للجميع */
export const DEMO_DATA_VERSION = 20261102;
export const LS_DEMO_VERSION = "pms_core_demo_version";

const LS_RECORDS = "pms_core_records_v1";
const LS_ENTITIES = "pms_core_entities_v1";
const LS_BRANCHES = "pms_core_branches_v1";
const LS_DEPARTMENTS = "pms_core_departments_v1";
const LS_CATEGORIES = "pms_core_categories_v1";
const LS_NOTIFICATIONS = "pms_core_notifications_v1";

export function applyDemoDataMigration() {
  try {
    if (localStorage.getItem(LS_DEMO_VERSION) === String(DEMO_DATA_VERSION)) return;
    localStorage.setItem(LS_DEMO_VERSION, String(DEMO_DATA_VERSION));
    localStorage.setItem(LS_RECORDS, JSON.stringify(SEED_RECORDS));
    localStorage.removeItem("pms_core_news_v1");
    localStorage.setItem(LS_ENTITIES, JSON.stringify(ENTITIES));
    localStorage.setItem(LS_BRANCHES, JSON.stringify(SEED_BRANCHES));
    localStorage.setItem(LS_DEPARTMENTS, JSON.stringify(SEED_DEPARTMENTS));
    localStorage.setItem(LS_CATEGORIES, JSON.stringify(SEED_CATEGORIES));
    localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
  } catch {
    /* ignore quota */
  }
}
