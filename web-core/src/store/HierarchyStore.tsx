import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyHierarchyMigration } from "../demo-mode/reset";
import { LS } from "../demo-mode/keys";
import { loadJson, saveJson } from "../demo-mode/storage";
import {
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
import { SEED_VENDORS } from "../lib/vendorSeed";
import {
  generatePortfolioCode,
  normalizePortfolio,
  type PortfolioAuditEvent,
  type PortfolioBenefit,
  type PortfolioRisk,
} from "../lib/portfolioDomain";
import { validateRelationship } from "../lib/relationshipRules";
import {
  applyRelationshipSideEffects,
  clearRelationshipSideEffects,
} from "../lib/relationshipSync";
import type {
  DemoInvite,
  EntityRelationship,
  Initiative,
  Milestone,
  Organization,
  Portfolio,
  Program,
  Project,
  ProjectActivity,
  ProjectCategory,
  ProjectExpense,
  ProjectMaterial,
  RelationshipHistoryEvent,
  RelationshipTypeKey,
  StrategicEntityType,
  StrategicObjective,
  TaskItem,
  Vendor,
  WorkAttachment,
  WorkComment,
} from "../models/domain";
import { recalcProjectProgress } from "../services/projectService";
import { rollupProjectTasks, withStageStatus } from "../lib/workProgress";
import { normalizePortfolioPolicy } from "../lib/orgPortfolioPolicy";
import {
  applyWorkflowAction,
  type PortfolioWorkflowAction,
} from "../services/portfolioWorkflow";
import { localizeDeep } from "../i18n/localizeContent";
import { useAuth } from "./AuthContext";
import { useLocale } from "./LocaleContext";

export type AddRelationshipInput = {
  sourceType: StrategicEntityType;
  sourceId: string;
  targetType: StrategicEntityType;
  targetId: string;
  relationshipType: RelationshipTypeKey;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdBy?: string;
  reason?: string;
};

interface HierarchyCtx {
  organization: Organization;
  objectives: StrategicObjective[];
  portfolios: Portfolio[];
  initiatives: Initiative[];
  programs: Program[];
  projects: Project[];
  milestones: Milestone[];
  projectCategories: ProjectCategory[];
  tasks: TaskItem[];
  workComments: WorkComment[];
  workAttachments: WorkAttachment[];
  projectExpenses: ProjectExpense[];
  projectActivities: ProjectActivity[];
  projectMaterials: ProjectMaterial[];
  vendors: Vendor[];
  invites: DemoInvite[];
  relationships: EntityRelationship[];
  relationshipHistory: RelationshipHistoryEvent[];
  portfolioRisks: PortfolioRisk[];
  portfolioBenefits: PortfolioBenefit[];
  portfolioAudit: PortfolioAuditEvent[];
  addVendor: (v: Omit<Vendor, "id" | "createdAt">) => Vendor;
  updateVendor: (id: string, patch: Partial<Vendor>) => void;
  removeVendor: (id: string) => void;
  setVendorProjects: (vendorId: string, projectIds: string[]) => void;
  addPortfolio: (p: Omit<Portfolio, "id">) => Portfolio;
  updatePortfolio: (id: string, patch: Partial<Portfolio>, actorUserId?: string) => void;
  removePortfolio: (id: string) => { ok: boolean; reason?: string };
  runPortfolioWorkflow: (
    id: string,
    action: PortfolioWorkflowAction,
    opts?: {
      actorUserId?: string;
      reason?: string;
      /** Just-created portfolio not yet flushed into React state */
      seed?: Portfolio;
    },
  ) => { ok: boolean; reason?: string };
  addPortfolioRisk: (
    r: Omit<PortfolioRisk, "id" | "createdAt" | "updatedAt" | "events">,
  ) => PortfolioRisk;
  updatePortfolioRisk: (
    id: string,
    patch: Partial<PortfolioRisk>,
    actorUserId?: string,
  ) => void;
  addPortfolioBenefit: (
    b: Omit<PortfolioBenefit, "id" | "createdAt" | "events"> & {
      actorUserId?: string;
    },
  ) => PortfolioBenefit;
  updatePortfolioBenefit: (
    id: string,
    patch: Partial<PortfolioBenefit>,
    actorUserId?: string,
  ) => void;
  addObjective: (o: Omit<StrategicObjective, "id">) => StrategicObjective;
  updateObjective: (id: string, patch: Partial<StrategicObjective>) => void;
  removeObjective: (id: string) => void;
  addProgram: (p: Omit<Program, "id">) => Program;
  updateProgram: (id: string, patch: Partial<Program>) => void;
  removeProgram: (id: string) => void;
  addInitiative: (i: Omit<Initiative, "id">) => Initiative;
  updateInitiative: (id: string, patch: Partial<Initiative>) => void;
  removeInitiative: (id: string) => void;
  addProject: (p: Omit<Project, "id" | "progress" | "createdAt">) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;
  addTask: (t: Omit<TaskItem, "id" | "createdAt">) => TaskItem;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  removeTask: (id: string) => void;
  addMilestone: (m: Omit<Milestone, "id">) => Milestone;
  updateMilestone: (id: string, patch: Partial<Milestone>) => void;
  removeMilestone: (id: string) => void;
  addProjectCategory: (c: Omit<ProjectCategory, "id">) => ProjectCategory;
  updateProjectCategory: (id: string, patch: Partial<ProjectCategory>) => void;
  removeProjectCategory: (id: string) => void;
  addWorkComment: (
    c: Omit<WorkComment, "id" | "createdAt" | "updatedAt">,
  ) => WorkComment;
  updateWorkComment: (id: string, text: string) => void;
  removeWorkComment: (id: string) => void;
  addWorkAttachment: (input: {
    projectId: string;
    entityType: WorkAttachment["entityType"];
    entityId: string;
    uploadedByUserId: string;
    file: File;
  }) => Promise<WorkAttachment>;
  removeWorkAttachment: (id: string) => void;
  addProjectExpense: (
    e: Omit<ProjectExpense, "id" | "createdAt">,
  ) => ProjectExpense;
  updateProjectExpense: (id: string, patch: Partial<ProjectExpense>) => void;
  removeProjectExpense: (id: string) => void;
  addProjectActivity: (
    a: Omit<ProjectActivity, "id" | "createdAt">,
  ) => ProjectActivity;
  removeProjectActivity: (id: string) => void;
  addProjectMaterial: (
    m: Omit<ProjectMaterial, "id" | "createdAt">,
  ) => ProjectMaterial;
  updateProjectMaterial: (id: string, patch: Partial<ProjectMaterial>) => void;
  removeProjectMaterial: (id: string) => void;
  removeProjectMember: (projectId: string, userId: string) => void;
  addInvite: (i: Omit<DemoInvite, "id" | "token" | "createdAt" | "status">) => DemoInvite;
  acceptInvite: (
    token: string,
  ) => { ok: boolean; reason?: string; invite?: DemoInvite };
  addProjectMember: (projectId: string, userId: string) => void;
  addRelationship: (
    input: AddRelationshipInput,
  ) => { ok: true; relationship: EntityRelationship } | { ok: false; errors: Record<string, string> };
  removeRelationship: (
    id: string,
    opts?: { userId?: string; reason?: string },
  ) => { ok: boolean; reason?: string };
  resetHierarchy: () => void;
}

const Ctx = createContext<HierarchyCtx | null>(null);

export function HierarchyProvider({ children }: { children: ReactNode }) {
  applyHierarchyMigration();
  const { organization: activeOrg, session } = useAuth();
  const { locale } = useLocale();
  const orgId =
    session?.organizationId ?? activeOrg?.id ?? SEED_ORG.id;

  const [objectivesAll, setObjectives] = useState(() =>
    loadJson(LS.objectives, SEED_OBJECTIVES),
  );
  const [portfoliosAll, setPortfolios] = useState(() =>
    loadJson(LS.portfolios, SEED_PORTFOLIOS),
  );
  const [initiativesAll, setInitiatives] = useState(() =>
    loadJson(LS.initiatives, SEED_INITIATIVES),
  );
  const [programsAll, setPrograms] = useState(() =>
    loadJson(LS.programs, SEED_PROGRAMS),
  );
  const [projectsAll, setProjects] = useState(() =>
    loadJson(LS.projects, SEED_PROJECTS),
  );
  const [milestonesAll, setMilestones] = useState(() =>
    loadJson(LS.milestones, SEED_MILESTONES),
  );
  const [categoriesAll, setCategories] = useState(() =>
    loadJson(LS.projectCategories, SEED_PROJECT_CATEGORIES),
  );
  const [tasksAll, setTasks] = useState(() => loadJson(LS.tasks, SEED_TASKS));
  const [workCommentsAll, setWorkComments] = useState(() =>
    loadJson(LS.workComments, SEED_WORK_COMMENTS),
  );
  const [workAttachmentsAll, setWorkAttachments] = useState(() =>
    loadJson(LS.workAttachments, SEED_WORK_ATTACHMENTS),
  );

  useEffect(() => {
    void import("../lib/attachmentFiles").then(({ ensureSeedAttachmentBlobs }) =>
      ensureSeedAttachmentBlobs(
        SEED_WORK_ATTACHMENTS.map((a) => ({
          id: a.id,
          name: a.name,
          mimeType: a.mimeType,
        })),
      ),
    );
  }, []);
  const [expensesAll, setExpenses] = useState(() =>
    loadJson(LS.projectExpenses, SEED_PROJECT_EXPENSES),
  );
  const [activitiesAll, setActivities] = useState(() =>
    loadJson(LS.projectActivities, SEED_PROJECT_ACTIVITIES),
  );
  const [materialsAll, setMaterials] = useState(() =>
    loadJson(LS.projectMaterials, SEED_PROJECT_MATERIALS),
  );
  const [vendorsAll, setVendors] = useState(() =>
    loadJson(LS.vendors, SEED_VENDORS),
  );
  const [invitesAll, setInvites] = useState(() => loadJson(LS.invites, SEED_INVITES));
  const [relationshipsAll, setRelationships] = useState(() =>
    loadJson(LS.relationships, SEED_RELATIONSHIPS),
  );
  const [relationshipHistoryAll, setRelationshipHistory] = useState(() =>
    loadJson(LS.relationshipHistory, SEED_RELATIONSHIP_HISTORY),
  );
  const [portfolioRisksAll, setPortfolioRisks] = useState(() =>
    loadJson(LS.portfolioRisks, SEED_PORTFOLIO_RISKS),
  );
  const [portfolioBenefitsAll, setPortfolioBenefits] = useState(() =>
    loadJson(LS.portfolioBenefits, SEED_PORTFOLIO_BENEFITS),
  );
  const [portfolioAuditAll, setPortfolioAudit] = useState(() =>
    loadJson(LS.portfolioAudit, SEED_PORTFOLIO_AUDIT),
  );

  useEffect(() => saveJson(LS.objectives, objectivesAll), [objectivesAll]);
  useEffect(() => saveJson(LS.portfolios, portfoliosAll), [portfoliosAll]);
  useEffect(() => saveJson(LS.initiatives, initiativesAll), [initiativesAll]);
  useEffect(() => saveJson(LS.programs, programsAll), [programsAll]);
  useEffect(() => saveJson(LS.projects, projectsAll), [projectsAll]);
  useEffect(() => saveJson(LS.milestones, milestonesAll), [milestonesAll]);
  useEffect(() => saveJson(LS.projectCategories, categoriesAll), [categoriesAll]);
  useEffect(() => saveJson(LS.tasks, tasksAll), [tasksAll]);
  useEffect(() => saveJson(LS.workComments, workCommentsAll), [workCommentsAll]);
  useEffect(
    () => saveJson(LS.workAttachments, workAttachmentsAll),
    [workAttachmentsAll],
  );
  useEffect(() => saveJson(LS.projectExpenses, expensesAll), [expensesAll]);
  useEffect(() => saveJson(LS.projectActivities, activitiesAll), [activitiesAll]);
  useEffect(() => saveJson(LS.projectMaterials, materialsAll), [materialsAll]);
  useEffect(() => saveJson(LS.vendors, vendorsAll), [vendorsAll]);
  useEffect(() => saveJson(LS.invites, invitesAll), [invitesAll]);
  useEffect(() => saveJson(LS.relationships, relationshipsAll), [relationshipsAll]);
  useEffect(
    () => saveJson(LS.relationshipHistory, relationshipHistoryAll),
    [relationshipHistoryAll],
  );
  useEffect(() => saveJson(LS.portfolioRisks, portfolioRisksAll), [portfolioRisksAll]);
  useEffect(
    () => saveJson(LS.portfolioBenefits, portfolioBenefitsAll),
    [portfolioBenefitsAll],
  );
  useEffect(() => saveJson(LS.portfolioAudit, portfolioAuditAll), [portfolioAuditAll]);

  const organization: Organization = activeOrg
    ? {
        ...SEED_ORG,
        ...activeOrg,
        clientType: activeOrg.clientType ?? SEED_ORG.clientType,
        enabledModules: activeOrg.enabledModules ?? SEED_ORG.enabledModules,
        portfolioPolicy: normalizePortfolioPolicy(
          activeOrg.portfolioPolicy ?? SEED_ORG.portfolioPolicy,
          activeOrg.clientType ?? SEED_ORG.clientType,
        ),
      }
    : { ...SEED_ORG, id: orgId };

  const portfolioPolicy = organization.portfolioPolicy!;

  const objectives = useMemo(
    () => objectivesAll.filter((x) => x.organizationId === orgId),
    [objectivesAll, orgId],
  );
  const portfolios = useMemo(
    () =>
      portfoliosAll
        .filter((x) => x.organizationId === orgId)
        .map(normalizePortfolio),
    [portfoliosAll, orgId],
  );
  const initiatives = useMemo(
    () => initiativesAll.filter((x) => x.organizationId === orgId),
    [initiativesAll, orgId],
  );
  const programs = useMemo(
    () => programsAll.filter((x) => x.organizationId === orgId),
    [programsAll, orgId],
  );
  const projects = useMemo(
    () => projectsAll.filter((x) => x.organizationId === orgId),
    [projectsAll, orgId],
  );
  const projectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const milestones = useMemo(
    () => milestonesAll.filter((m) => projectIds.has(m.projectId)),
    [milestonesAll, projectIds],
  );
  const projectCategories = useMemo(
    () => categoriesAll.filter((c) => projectIds.has(c.projectId)),
    [categoriesAll, projectIds],
  );
  const tasks = useMemo(
    () => tasksAll.filter((t) => projectIds.has(t.projectId)),
    [tasksAll, projectIds],
  );
  const workComments = useMemo(
    () => workCommentsAll.filter((c) => projectIds.has(c.projectId)),
    [workCommentsAll, projectIds],
  );
  const workAttachments = useMemo(
    () => workAttachmentsAll.filter((a) => projectIds.has(a.projectId)),
    [workAttachmentsAll, projectIds],
  );
  const projectExpenses = useMemo(
    () => expensesAll.filter((e) => projectIds.has(e.projectId)),
    [expensesAll, projectIds],
  );
  const projectActivities = useMemo(
    () => activitiesAll.filter((a) => projectIds.has(a.projectId)),
    [activitiesAll, projectIds],
  );
  const projectMaterials = useMemo(
    () => materialsAll.filter((m) => projectIds.has(m.projectId)),
    [materialsAll, projectIds],
  );
  const invites = useMemo(
    () => invitesAll.filter((i) => i.organizationId === orgId),
    [invitesAll, orgId],
  );
  const relationships = useMemo(
    () => relationshipsAll.filter((r) => r.organizationId === orgId),
    [relationshipsAll, orgId],
  );
  const relationshipHistory = useMemo(
    () => relationshipHistoryAll.filter((r) => r.organizationId === orgId),
    [relationshipHistoryAll, orgId],
  );
  const portfolioRisks = useMemo(
    () => portfolioRisksAll.filter((r) => r.organizationId === orgId),
    [portfolioRisksAll, orgId],
  );
  const portfolioBenefits = useMemo(
    () => portfolioBenefitsAll.filter((r) => r.organizationId === orgId),
    [portfolioBenefitsAll, orgId],
  );
  const portfolioAudit = useMemo(
    () => portfolioAuditAll.filter((r) => r.organizationId === orgId),
    [portfolioAuditAll, orgId],
  );
  const vendors = useMemo(
    () => vendorsAll.filter((v) => v.organizationId === orgId),
    [vendorsAll, orgId],
  );

  const syncProjectProgress = (projectId: string, nextTasks: TaskItem[]) => {
    const progress = recalcProjectProgress(nextTasks.filter((t) => t.projectId === projectId));
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, progress } : p)),
    );
  };

  const localized = useMemo(
    () => ({
      organization: localizeDeep(organization, locale),
      objectives: localizeDeep(objectives, locale),
      portfolios: localizeDeep(portfolios, locale),
      initiatives: localizeDeep(initiatives, locale),
      programs: localizeDeep(programs, locale),
      projects: localizeDeep(projects, locale),
      milestones: localizeDeep(milestones, locale),
      projectCategories: localizeDeep(projectCategories, locale),
      tasks: localizeDeep(tasks, locale),
      workComments: localizeDeep(workComments, locale),
      workAttachments: localizeDeep(workAttachments, locale),
      projectExpenses: localizeDeep(projectExpenses, locale),
      projectActivities: localizeDeep(projectActivities, locale),
      projectMaterials: localizeDeep(projectMaterials, locale),
      vendors: localizeDeep(vendors, locale),
      invites: localizeDeep(invites, locale),
      relationships: localizeDeep(relationships, locale),
      relationshipHistory: localizeDeep(relationshipHistory, locale),
      portfolioRisks: localizeDeep(portfolioRisks, locale),
      portfolioBenefits: localizeDeep(portfolioBenefits, locale),
      portfolioAudit: localizeDeep(portfolioAudit, locale),
    }),
    [
      locale,
      organization,
      objectives,
      portfolios,
      initiatives,
      programs,
      projects,
      milestones,
      projectCategories,
      tasks,
      workComments,
      workAttachments,
      projectExpenses,
      projectActivities,
      projectMaterials,
      vendors,
      invites,
      relationships,
      relationshipHistory,
      portfolioRisks,
      portfolioBenefits,
      portfolioAudit,
    ],
  );

  const value = useMemo<HierarchyCtx>(
    () => ({
      organization: localized.organization,
      objectives: localized.objectives,
      portfolios: localized.portfolios,
      initiatives: localized.initiatives,
      programs: localized.programs,
      projects: localized.projects,
      milestones: localized.milestones,
      projectCategories: localized.projectCategories,
      tasks: localized.tasks,
      workComments: localized.workComments,
      workAttachments: localized.workAttachments,
      projectExpenses: localized.projectExpenses,
      projectActivities: localized.projectActivities,
      projectMaterials: localized.projectMaterials,
      vendors: localized.vendors,
      invites: localized.invites,
      relationships: localized.relationships,
      relationshipHistory: localized.relationshipHistory,
      portfolioRisks: localized.portfolioRisks,
      portfolioBenefits: localized.portfolioBenefits,
      portfolioAudit: localized.portfolioAudit,
      addVendor: (v) => {
        const row: Vendor = {
          ...v,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        setVendors((prev) => [row, ...prev]);
        return row;
      },
      updateVendor: (id, patch) =>
        setVendors((prev) =>
          prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        ),
      removeVendor: (id) =>
        setVendors((prev) => prev.filter((v) => v.id !== id)),
      setVendorProjects: (vendorId, projectIds) =>
        setVendors((prev) =>
          prev.map((v) => (v.id === vendorId ? { ...v, projectIds } : v)),
        ),
      addPortfolio: (p) => {
        const stamp = new Date().toISOString();
        const code =
          p.code ||
          generatePortfolioCode(
            portfoliosAll.filter((x) => x.organizationId === orgId),
            p.fiscalYear || new Date().getFullYear(),
          );
        const row = normalizePortfolio({
          ...p,
          id: crypto.randomUUID(),
          code,
          status: p.status || "draft",
          createdAt: stamp,
          updatedAt: stamp,
          createdByUserId: p.createdByUserId || p.ownerUserId,
        });
        setPortfolios((prev) => [row, ...prev]);
        setPortfolioAudit((prev) => [
          {
            id: crypto.randomUUID(),
            organizationId: orgId,
            portfolioId: row.id,
            action: "created",
            actorUserId: row.createdByUserId,
            toStatus: row.status,
            createdAt: stamp,
          },
          ...prev,
        ]);
        return row;
      },
      updatePortfolio: (id, patch, actorUserId) => {
        const stamp = new Date().toISOString();
        setPortfolios((prev) =>
          prev.map((x) =>
            x.id === id ? normalizePortfolio({ ...x, ...patch, updatedAt: stamp }) : x,
          ),
        );
        setPortfolioAudit((prev) => [
          {
            id: crypto.randomUUID(),
            organizationId: orgId,
            portfolioId: id,
            action: "updated",
            actorUserId,
            comment: Object.keys(patch).join(", "),
            createdAt: stamp,
          },
          ...prev,
        ]);
      },
      removePortfolio: (id) => {
        if (programs.some((p) => p.portfolioId === id) || projects.some((p) => p.portfolioId === id)) {
          return { ok: false, reason: "لا يمكن حذف محفظة مرتبطة ببرامج أو مشاريع." };
        }
        setPortfolios((prev) => prev.filter((x) => x.id !== id));
        return { ok: true };
      },
      runPortfolioWorkflow: (id, action, opts) => {
        const fromStore = portfoliosAll.find((p) => p.id === id);
        const current =
          fromStore && fromStore.organizationId === orgId
            ? fromStore
            : opts?.seed &&
                opts.seed.id === id &&
                opts.seed.organizationId === orgId
              ? opts.seed
              : undefined;
        if (!current) {
          return { ok: false, reason: "المحفظة غير موجودة." };
        }
        const result = applyWorkflowAction(current, action, {
          actorUserId: opts?.actorUserId,
          reason: opts?.reason,
          policy: portfolioPolicy,
        });
        if (!result.ok) return { ok: false, reason: result.reason };
        setPortfolios((prev) => {
          const exists = prev.some((p) => p.id === id);
          if (exists) {
            return prev.map((p) => (p.id === id ? result.portfolio : p));
          }
          return [result.portfolio, ...prev];
        });
        setPortfolioAudit((prev) => [
          {
            id: crypto.randomUUID(),
            organizationId: orgId,
            portfolioId: id,
            action,
            actorUserId: opts?.actorUserId,
            fromStatus: normalizePortfolio(current).status,
            toStatus: result.portfolio.status,
            comment: opts?.reason
              ? `${opts.reason} · policy v${portfolioPolicy.version}`
              : `policy v${portfolioPolicy.version}`,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        return { ok: true };
      },
      addPortfolioRisk: (r) => {
        const stamp = new Date().toISOString();
        const row: PortfolioRisk = {
          ...r,
          id: crypto.randomUUID(),
          createdAt: stamp,
          updatedAt: stamp,
          events: [
            {
              id: crypto.randomUUID(),
              at: stamp,
              actorUserId: r.ownerUserId,
              kind: "created",
              to: r.status,
            },
          ],
        };
        setPortfolioRisks((prev) => [row, ...prev]);
        return row;
      },
      updatePortfolioRisk: (id, patch, actorUserId) =>
        setPortfolioRisks((prev) =>
          prev.map((x) => {
            if (x.id !== id) return x;
            const { events: _ignored, ...rest } = patch;
            if (rest.status && rest.status !== x.status) {
              const order = ["open", "mitigating", "closed"] as const;
              const from = order.indexOf(x.status as (typeof order)[number]);
              const to = order.indexOf(rest.status as (typeof order)[number]);
              if (from >= 0 && to >= 0 && to < from) return x;
            }
            const stamp = new Date().toISOString();
            const next: PortfolioRisk = { ...x, ...rest, updatedAt: stamp };
            if (rest.status && rest.status !== x.status) {
              next.events = [
                {
                  id: crypto.randomUUID(),
                  at: stamp,
                  actorUserId,
                  kind: "status",
                  from: x.status,
                  to: rest.status,
                },
                ...(x.events ?? []),
              ];
            }
            return next;
          }),
        ),
      addPortfolioBenefit: (b) => {
        const stamp = new Date().toISOString();
        const { actorUserId, ...rest } = b;
        const row: PortfolioBenefit = {
          ...rest,
          id: crypto.randomUUID(),
          createdAt: stamp,
          events: [
            {
              id: crypto.randomUUID(),
              at: stamp,
              actorUserId,
              kind: "created",
              to: rest.status,
            },
          ],
        };
        setPortfolioBenefits((prev) => [row, ...prev]);
        return row;
      },
      updatePortfolioBenefit: (id, patch, actorUserId) =>
        setPortfolioBenefits((prev) =>
          prev.map((x) => {
            if (x.id !== id) return x;
            const { events: _ignored, ...rest } = patch;
            if (rest.status && rest.status !== x.status) {
              const main = ["planned", "in_progress", "realized"] as const;
              const nextStatus = rest.status;
              const cur = x.status;
              if (cur === "realized") return x;
              if (cur === "deferred") {
                if (nextStatus === "planned") return x;
              } else {
                const from = main.indexOf(cur as (typeof main)[number]);
                const to = main.indexOf(nextStatus as (typeof main)[number]);
                if (from >= 0 && to >= 0 && to < from) return x;
                if (nextStatus !== "deferred" && to < 0) return x;
              }
            }
            const next: PortfolioBenefit = { ...x, ...rest };
            if (rest.status && rest.status !== x.status) {
              next.events = [
                {
                  id: crypto.randomUUID(),
                  at: new Date().toISOString(),
                  actorUserId,
                  kind: "status",
                  from: x.status,
                  to: rest.status,
                },
                ...(x.events ?? []),
              ];
            }
            return next;
          }),
        ),
      addObjective: (o) => {
        const row: StrategicObjective = { ...o, id: crypto.randomUUID() };
        setObjectives((prev) => [row, ...prev]);
        return row;
      },
      updateObjective: (id, patch) =>
        setObjectives((prev) =>
          prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        ),
      removeObjective: (id) => {
        setObjectives((prev) => prev.filter((x) => x.id !== id));
        setInitiatives((prev) =>
          prev.map((i) =>
            i.objectiveIds.includes(id)
              ? {
                  ...i,
                  objectiveIds: i.objectiveIds.filter((oid) => oid !== id),
                }
              : i,
          ),
        );
        setPortfolios((prev) =>
          prev.map((p) =>
            (p.objectiveIds ?? []).includes(id)
              ? {
                  ...p,
                  objectiveIds: (p.objectiveIds ?? []).filter(
                    (oid) => oid !== id,
                  ),
                }
              : p,
          ),
        );
      },
      addProgram: (p) => {
        const row: Program = { ...p, id: crypto.randomUUID() };
        setPrograms((prev) => [row, ...prev]);
        return row;
      },
      updateProgram: (id, patch) =>
        setPrograms((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
      removeProgram: (id) => {
        const stamp = new Date().toISOString();
        setPrograms((prev) => prev.filter((x) => x.id !== id));
        setProjects((prev) =>
          prev.map((p) =>
            p.programId === id
              ? { ...p, programId: undefined, standalone: true }
              : p,
          ),
        );
        setRelationships((prev) =>
          prev.map((r) => {
            const touches =
              (r.sourceType === "program" && r.sourceId === id) ||
              (r.targetType === "program" && r.targetId === id);
            if (!touches || !r.isActive) return r;
            return {
              ...r,
              isActive: false,
              updatedAt: stamp,
              effectiveTo: r.effectiveTo ?? stamp.slice(0, 10),
            };
          }),
        );
      },
      addInitiative: (i) => {
        const row: Initiative = { ...i, id: crypto.randomUUID() };
        setInitiatives((prev) => [row, ...prev]);
        return row;
      },
      updateInitiative: (id, patch) =>
        setInitiatives((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
      removeInitiative: (id) => {
        const stamp = new Date().toISOString();
        setInitiatives((prev) => prev.filter((x) => x.id !== id));
        setPrograms((prev) =>
          prev.map((p) =>
            p.initiativeId === id ? { ...p, initiativeId: undefined } : p,
          ),
        );
        setRelationships((prev) =>
          prev.map((r) => {
            const touches =
              (r.sourceType === "initiative" && r.sourceId === id) ||
              (r.targetType === "initiative" && r.targetId === id);
            if (!touches || !r.isActive) return r;
            return {
              ...r,
              isActive: false,
              updatedAt: stamp,
              effectiveTo: r.effectiveTo ?? stamp.slice(0, 10),
            };
          }),
        );
      },
      addProject: (p) => {
        const row: Project = {
          ...p,
          id: crypto.randomUUID(),
          progress: 0,
          createdAt: new Date().toISOString(),
        };
        setProjects((prev) => [row, ...prev]);
        return row;
      },
      updateProject: (id, patch) =>
        setProjects((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
      removeProject: (id) => {
        setProjects((prev) => prev.filter((x) => x.id !== id));
        setTasks((prev) => prev.filter((t) => t.projectId !== id));
        setMilestones((prev) => prev.filter((m) => m.projectId !== id));
        setCategories((prev) => prev.filter((c) => c.projectId !== id));
        setWorkComments((prev) => prev.filter((c) => c.projectId !== id));
        setWorkAttachments((prev) => {
          const removed = prev.filter((a) => a.projectId === id);
          void import("../lib/attachmentFiles").then(({ deleteAttachmentBlob }) => {
            for (const a of removed) void deleteAttachmentBlob(a.id);
          });
          return prev.filter((a) => a.projectId !== id);
        });
        setExpenses((prev) => prev.filter((e) => e.projectId !== id));
        setActivities((prev) => prev.filter((a) => a.projectId !== id));
        setMaterials((prev) => prev.filter((m) => m.projectId !== id));
      },
      addTask: (t) => {
        const row: TaskItem = {
          ...t,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        setTasks((prev) => {
          const rolled = rollupProjectTasks([row, ...prev], row.projectId);
          queueMicrotask(() => syncProjectProgress(row.projectId, rolled));
          return rolled;
        });
        return row;
      },
      updateTask: (id, patch) => {
        setTasks((prev) => {
          const base = prev.map((x) => (x.id === id ? { ...x, ...patch } : x));
          const projectId = base.find((t) => t.id === id)?.projectId;
          if (!projectId) return base;
          const rolled = rollupProjectTasks(base, projectId);
          queueMicrotask(() => syncProjectProgress(projectId, rolled));
          return rolled;
        });
      },
      removeTask: (id) => {
        setTasks((prev) => {
          const target = prev.find((t) => t.id === id);
          const next = prev.filter((t) => t.id !== id && t.parentTaskId !== id);
          if (!target) return next;
          const rolled = rollupProjectTasks(next, target.projectId);
          queueMicrotask(() =>
            syncProjectProgress(target.projectId, rolled),
          );
          return rolled;
        });
      },
      addMilestone: (m) => {
        const status = m.status ?? (m.completed ? "completed" : "planned");
        const row: Milestone = {
          ...m,
          description: m.description ?? "",
          status,
          completed: status === "completed",
          id: crypto.randomUUID(),
        };
        setMilestones((prev) => [...prev, row]);
        return row;
      },
      updateMilestone: (id, patch) =>
        setMilestones((prev) =>
          prev.map((x) =>
            x.id === id ? { ...x, ...withStageStatus(patch) } : x,
          ),
        ),
      removeMilestone: (id) => {
        setMilestones((prev) => prev.filter((m) => m.id !== id));
        setCategories((prev) => prev.filter((c) => c.stageId !== id));
        setTasks((prev) =>
          prev.map((t) =>
            t.milestoneId === id ? { ...t, milestoneId: undefined } : t,
          ),
        );
      },
      addProjectCategory: (c) => {
        const row: ProjectCategory = { ...c, id: crypto.randomUUID() };
        setCategories((prev) => [...prev, row]);
        return row;
      },
      updateProjectCategory: (id, patch) =>
        setCategories((prev) =>
          prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        ),
      removeProjectCategory: (id) => {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setTasks((prev) =>
          prev.map((t) =>
            t.categoryId === id ? { ...t, categoryId: undefined } : t,
          ),
        );
      },
      addWorkComment: (c) => {
        const row: WorkComment = {
          ...c,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        setWorkComments((prev) => [row, ...prev]);
        return row;
      },
      updateWorkComment: (id, text) => {
        const stamp = new Date().toISOString();
        setWorkComments((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, text: text.trim(), updatedAt: stamp } : c,
          ),
        );
      },
      removeWorkComment: (id) =>
        setWorkComments((prev) => prev.filter((c) => c.id !== id)),
      addWorkAttachment: async ({
        projectId,
        entityType,
        entityId,
        uploadedByUserId,
        file,
      }) => {
        const {
          ATTACHMENT_MAX_BYTES,
          formatSizeLabel,
          guessMimeFromName,
          putAttachmentBlob,
        } = await import("../lib/attachmentFiles");
        if (file.size > ATTACHMENT_MAX_BYTES) {
          throw new Error("حجم الملف يتجاوز الحد المسموح (8 م.ب).");
        }
        const id = crypto.randomUUID();
        const mimeType = file.type || guessMimeFromName(file.name);
        await putAttachmentBlob(id, file);
        const row: WorkAttachment = {
          id,
          projectId,
          entityType,
          entityId,
          name: file.name,
          sizeBytes: file.size,
          sizeLabel: formatSizeLabel(file.size),
          mimeType,
          hasFile: true,
          uploadedByUserId,
          createdAt: new Date().toISOString(),
        };
        setWorkAttachments((prev) => [row, ...prev]);
        return row;
      },
      removeWorkAttachment: (id) => {
        setWorkAttachments((prev) => prev.filter((a) => a.id !== id));
        void import("../lib/attachmentFiles").then(({ deleteAttachmentBlob }) =>
          deleteAttachmentBlob(id),
        );
      },
      addProjectExpense: (e) => {
        const row: ProjectExpense = {
          ...e,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        setExpenses((prev) => [row, ...prev]);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === e.projectId
              ? { ...p, spentSar: (p.spentSar || 0) + e.amountSar }
              : p,
          ),
        );
        return row;
      },
      updateProjectExpense: (id, patch) => {
        setExpenses((prev) => {
          const old = prev.find((x) => x.id === id);
          if (!old) return prev;
          const nextRow = { ...old, ...patch };
          const delta = nextRow.amountSar - old.amountSar;
          if (delta !== 0) {
            setProjects((ps) =>
              ps.map((p) =>
                p.id === old.projectId
                  ? { ...p, spentSar: Math.max(0, (p.spentSar || 0) + delta) }
                  : p,
              ),
            );
          }
          return prev.map((x) => (x.id === id ? nextRow : x));
        });
      },
      removeProjectExpense: (id) => {
        setExpenses((prev) => {
          const old = prev.find((x) => x.id === id);
          if (old) {
            setProjects((ps) =>
              ps.map((p) =>
                p.id === old.projectId
                  ? {
                      ...p,
                      spentSar: Math.max(0, (p.spentSar || 0) - old.amountSar),
                    }
                  : p,
              ),
            );
          }
          return prev.filter((x) => x.id !== id);
        });
      },
      addProjectActivity: (a) => {
        const row: ProjectActivity = {
          ...a,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        setActivities((prev) => [row, ...prev]);
        return row;
      },
      removeProjectActivity: (id) =>
        setActivities((prev) => prev.filter((a) => a.id !== id)),
      addProjectMaterial: (m) => {
        const row: ProjectMaterial = {
          ...m,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        setMaterials((prev) => [row, ...prev]);
        return row;
      },
      updateProjectMaterial: (id, patch) =>
        setMaterials((prev) =>
          prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        ),
      removeProjectMaterial: (id) => {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        setWorkAttachments((prev) => {
          const removed = prev.filter(
            (a) => a.entityType === "material" && a.entityId === id,
          );
          void import("../lib/attachmentFiles").then(({ deleteAttachmentBlob }) => {
            for (const a of removed) void deleteAttachmentBlob(a.id);
          });
          return prev.filter(
            (a) => !(a.entityType === "material" && a.entityId === id),
          );
        });
      },
      addInvite: (i) => {
        const row: DemoInvite = {
          ...i,
          id: crypto.randomUUID(),
          status: "pending",
          createdAt: new Date().toISOString(),
          token: `inv-${crypto.randomUUID().slice(0, 8)}`,
        };
        setInvites((prev) => [row, ...prev]);
        return row;
      },
      acceptInvite: (token) => {
        const inv = invitesAll.find((x) => x.token === token);
        if (!inv) return { ok: false, reason: "رمز الدعوة غير صالح." };
        if (inv.status !== "pending") return { ok: false, reason: "تم استخدام الدعوة مسبقاً." };
        setInvites((prev) =>
          prev.map((x) => (x.id === inv.id ? { ...x, status: "accepted" } : x)),
        );
        return { ok: true, invite: { ...inv, status: "accepted" } };
      },
      addProjectMember: (projectId, userId) => {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId && !p.memberUserIds.includes(userId)
              ? { ...p, memberUserIds: [...p.memberUserIds, userId] }
              : p,
          ),
        );
      },
      removeProjectMember: (projectId, userId) => {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  memberUserIds: p.memberUserIds.filter((id) => id !== userId),
                }
              : p,
          ),
        );
      },
      addRelationship: (input) => {
        if (
          !portfolioPolicy.allowedRelationshipTypes.includes(input.relationshipType)
        ) {
          return {
            ok: false as const,
            errors: {
              relationshipType: "نوع العلاقة غير مسموح حسب سياسة المنظمة.",
            },
          };
        }
        if (
          !portfolioPolicy.allowDirectProjectLink &&
          input.relationshipType === "contains" &&
          ((input.sourceType === "portfolio" && input.targetType === "project") ||
            (input.sourceType === "project" && input.targetType === "portfolio"))
        ) {
          return {
            ok: false as const,
            errors: {
              targetId:
                "الربط المباشر بين المحفظة والمشروع غير مفعّل في سياسة المنظمة.",
            },
          };
        }
        const result = validateRelationship({
          ...input,
          existing: relationshipsAll.filter((r) => r.organizationId === orgId),
        });
        if (!result.ok) {
          return { ok: false as const, errors: result.errors as Record<string, string> };
        }
        const stamp = new Date().toISOString();
        const row: EntityRelationship = {
          id: crypto.randomUUID(),
          organizationId: orgId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          targetType: input.targetType,
          targetId: input.targetId,
          relationshipType: input.relationshipType,
          description: input.description,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo,
          isActive: true,
          createdBy: input.createdBy,
          createdAt: stamp,
          updatedAt: stamp,
        };
        setRelationships((prev) => [row, ...prev]);
        setRelationshipHistory((prev) => [
          {
            id: crypto.randomUUID(),
            organizationId: orgId,
            relationshipId: row.id,
            action: "created",
            sourceType: row.sourceType,
            sourceId: row.sourceId,
            targetType: row.targetType,
            targetId: row.targetId,
            relationshipType: row.relationshipType,
            reason: input.reason ?? input.description,
            userId: input.createdBy,
            createdAt: stamp,
          },
          ...prev,
        ]);
        const side = applyRelationshipSideEffects(row, {
          projects: projectsAll,
          programs: programsAll,
          initiatives: initiativesAll,
        });
        if (side.projects) setProjects(side.projects);
        if (side.programs) setPrograms(side.programs);
        if (side.initiatives) setInitiatives(side.initiatives);
        return { ok: true as const, relationship: row };
      },
      removeRelationship: (id, opts) => {
        const current = relationshipsAll.find((r) => r.id === id);
        if (!current || current.organizationId !== orgId) {
          return { ok: false, reason: "العلاقة غير موجودة." };
        }
        const stamp = new Date().toISOString();
        setRelationships((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, isActive: false, updatedAt: stamp, effectiveTo: r.effectiveTo ?? stamp.slice(0, 10) }
              : r,
          ),
        );
        setRelationshipHistory((prev) => [
          {
            id: crypto.randomUUID(),
            organizationId: orgId,
            relationshipId: id,
            action: "removed",
            sourceType: current.sourceType,
            sourceId: current.sourceId,
            targetType: current.targetType,
            targetId: current.targetId,
            relationshipType: current.relationshipType,
            reason: opts?.reason ?? "إزالة العلاقة دون حذف الكيانات",
            userId: opts?.userId,
            createdAt: stamp,
          },
          ...prev,
        ]);
        const side = clearRelationshipSideEffects(current, {
          projects: projectsAll,
          programs: programsAll,
          initiatives: initiativesAll,
        });
        if (side.projects) setProjects(side.projects);
        if (side.programs) setPrograms(side.programs);
        if (side.initiatives) setInitiatives(side.initiatives);
        return { ok: true };
      },
      resetHierarchy: () => {
        setObjectives(SEED_OBJECTIVES);
        setPortfolios(SEED_PORTFOLIOS);
        setInitiatives(SEED_INITIATIVES);
        setPrograms(SEED_PROGRAMS);
        setProjects(SEED_PROJECTS);
        setMilestones(SEED_MILESTONES);
        setCategories(SEED_PROJECT_CATEGORIES);
        setTasks(SEED_TASKS);
        setWorkComments(SEED_WORK_COMMENTS);
        setWorkAttachments(SEED_WORK_ATTACHMENTS);
        setExpenses(SEED_PROJECT_EXPENSES);
        setActivities(SEED_PROJECT_ACTIVITIES);
        setMaterials(SEED_PROJECT_MATERIALS);
        setVendors(SEED_VENDORS);
        setInvites(SEED_INVITES);
        setRelationships(SEED_RELATIONSHIPS);
        setRelationshipHistory(SEED_RELATIONSHIP_HISTORY);
        setPortfolioRisks(SEED_PORTFOLIO_RISKS);
        setPortfolioBenefits(SEED_PORTFOLIO_BENEFITS);
        setPortfolioAudit(SEED_PORTFOLIO_AUDIT);
      },
    }),
    [
      localized,
      invitesAll,
      relationshipsAll,
      projectsAll,
      programsAll,
      initiativesAll,
      portfoliosAll,
      orgId,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHierarchy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHierarchy must be used within HierarchyProvider");
  return ctx;
}
