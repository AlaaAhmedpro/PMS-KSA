import { LS } from "./keys";
import { removeKey, saveJson } from "./storage";
import {
  SEED_DEMO_USERS,
  SEED_INITIATIVES,
  SEED_INVITES,
  SEED_MILESTONES,
  SEED_OBJECTIVES,
  SEED_ORG,
  SEED_PORTFOLIOS,
  SEED_PROGRAMS,
  SEED_PROJECTS,
  SEED_TASKS,
} from "../lib/hierarchySeed";
import {
  SEED_RELATIONSHIP_HISTORY,
  SEED_RELATIONSHIPS,
} from "../lib/relationshipSeed";
import {
  SEED_PORTFOLIO_AUDIT,
  SEED_PORTFOLIO_BENEFITS,
  SEED_PORTFOLIO_RISKS,
} from "../lib/portfolioSeedExtras";
import {
  SEED_PROJECT_ACTIVITIES,
  SEED_PROJECT_CATEGORIES,
  SEED_PROJECT_EXPENSES,
  SEED_PROJECT_MATERIALS,
  SEED_WORK_ATTACHMENTS,
  SEED_WORK_COMMENTS,
} from "../lib/projectWorkSeed";
import { ENTITIES, SEED_NOTIFICATIONS, SEED_RECORDS } from "../lib/mockData";
import {
  DEFAULT_MATRIX,
  ROLES,
  SEED_BRANCHES,
  SEED_CATEGORIES,
  SEED_DEPARTMENTS,
} from "../lib/constants";

export const DEMO_DATA_VERSION = 20261116;

/** Wipe demo localStorage collections and restore seed datasets. */
export function resetAllDemoData(): void {
  saveJson(LS.demoVersion, String(DEMO_DATA_VERSION));
  saveJson(LS.users, SEED_DEMO_USERS);
  saveJson(LS.organizations, [SEED_ORG]);
  saveJson(LS.objectives, SEED_OBJECTIVES);
  saveJson(LS.portfolios, SEED_PORTFOLIOS);
  saveJson(LS.initiatives, SEED_INITIATIVES);
  saveJson(LS.programs, SEED_PROGRAMS);
  saveJson(LS.projects, SEED_PROJECTS);
  saveJson(LS.milestones, SEED_MILESTONES);
  saveJson(LS.projectCategories, SEED_PROJECT_CATEGORIES);
  saveJson(LS.tasks, SEED_TASKS);
  saveJson(LS.workComments, SEED_WORK_COMMENTS);
  saveJson(LS.workAttachments, SEED_WORK_ATTACHMENTS);
  saveJson(LS.projectExpenses, SEED_PROJECT_EXPENSES);
  saveJson(LS.projectActivities, SEED_PROJECT_ACTIVITIES);
  saveJson(LS.projectMaterials, SEED_PROJECT_MATERIALS);
  saveJson(LS.invites, SEED_INVITES);
  saveJson(LS.relationships, SEED_RELATIONSHIPS);
  saveJson(LS.relationshipHistory, SEED_RELATIONSHIP_HISTORY);
  saveJson(LS.portfolioRisks, SEED_PORTFOLIO_RISKS);
  saveJson(LS.portfolioBenefits, SEED_PORTFOLIO_BENEFITS);
  saveJson(LS.portfolioAudit, SEED_PORTFOLIO_AUDIT);
  saveJson(LS.records, SEED_RECORDS);
  saveJson(LS.entities, ENTITIES);
  removeKey("pms_core_news_v1");
  saveJson(LS.branches, SEED_BRANCHES);
  saveJson(LS.departments, SEED_DEPARTMENTS);
  saveJson(LS.categories, SEED_CATEGORIES);
  saveJson(LS.notifications, SEED_NOTIFICATIONS);
  saveJson(LS.roles, ROLES);
  saveJson(LS.matrix, DEFAULT_MATRIX);
  removeKey(LS.session);
  removeKey(LS.loginAttempts);
  removeKey(LS.sentMail);
  void restoreSeedAttachmentFiles();
}

async function restoreSeedAttachmentFiles(): Promise<void> {
  const { clearAllAttachmentBlobs, ensureSeedAttachmentBlobs } = await import(
    "../lib/attachmentFiles"
  );
  await clearAllAttachmentBlobs();
  await ensureSeedAttachmentBlobs(
    SEED_WORK_ATTACHMENTS.map((a) => ({
      id: a.id,
      name: a.name,
      mimeType: a.mimeType,
    })),
  );
}

export function applyHierarchyMigration(): void {
  try {
    if (localStorage.getItem(LS.demoVersion) === String(DEMO_DATA_VERSION)) return;
    resetAllDemoData();
  } catch {
    /* ignore */
  }
}
