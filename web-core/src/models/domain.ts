import type { AnyRoleId, PermissionKey } from "../lib/types";

/** Diagram roles for Core PMS (Platform Admin lives in web-admin) */
export type CoreRoleId =
  | "org_admin"
  | "project_manager"
  | "member"
  | "external"
  | "executive"
  | "pr";

export type ProjectStatus =
  | "draft"
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";

/** حالة مرحلة العمل داخل المشروع */
export type StageStatus =
  | "planned"
  | "active"
  | "completed"
  | "on_hold"
  | "cancelled";

export type Priority = "low" | "normal" | "high" | "critical";

export type OrgModuleKey =
  | "portfolio"
  | "program"
  | "initiative"
  | "strategicObjectives";

export type OrgEnabledModules = Record<OrgModuleKey, boolean>;

/** نوع الجهة يحدد الميزات ومسار العمل وشكل التنقل */
export type OrgClientType = "small" | "enterprise" | "government";

export type RelationshipTypeKey =
  | "contains"
  | "aligns_with"
  | "depends_on"
  | "related_to";

export interface Organization {
  id: string;
  name: string;
  sector: string;
  city: string;
  active: boolean;
  createdAt: string;
  /** شركة صغيرة | مؤسسة كبيرة | جهة حكومية */
  clientType: OrgClientType;
  /** Optional product modules; projects are always available */
  enabledModules: OrgEnabledModules;
  /**
   * Configurable portfolio governance policy (shared core + profile templates).
   * Stored as JSON on the organization — versioned for audit of future decisions.
   */
  portfolioPolicy?: OrgPortfolioPolicy;
}

export type PortfolioProfileTemplate =
  | "small"
  | "enterprise"
  | "government"
  | "custom";

export type PortfolioWorkflowMode = "simple" | "standard" | "formal";

export interface PortfolioWorkflowStageDef {
  id: string;
  nameAr: string;
  key: "review" | "finance" | "executive";
  requiredRole: "pmo" | "finance" | "executive";
  enabled: boolean;
}

/** Organization-scoped portfolio governance configuration */
export interface OrgPortfolioPolicy {
  version: number;
  profileTemplate: PortfolioProfileTemplate;
  countryRegion: string;
  defaultCurrency: "SAR" | "AED";
  fiscalYearStartMonth: number;
  workflowMode: PortfolioWorkflowMode;
  stages: PortfolioWorkflowStageDef[];
  requireSponsor: boolean;
  requireObjectivesOnSubmit: boolean;
  requireBudgetOnSubmit: boolean;
  requireDocumentsOnSubmit: boolean;
  allowDirectProjectLink: boolean;
  lockFieldsAfterApproval: boolean;
  requireReasonOnReject: boolean;
  requireReasonOnReturn: boolean;
  separationOfDuties: boolean;
  budgetChangeRequiresApproval: boolean;
  budgetApprovalThresholdSar: number;
  varianceWarningPct: number;
  allowedRelationshipTypes: RelationshipTypeKey[];
  requiredAtCreate: Array<"name" | "description" | "ownerUserId" | "code">;
  requiredAtSubmit: Array<
    | "sponsorUserId"
    | "objectiveIds"
    | "plannedBudgetSar"
    | "startDate"
    | "departmentId"
  >;
  requiredAtActivate: Array<"approvedBudgetSar">;
  updatedAt: string;
  notes?: string;
}

export interface StrategicObjective {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  targetYear: number;
}

export interface Portfolio {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  ownerUserId: string;
  /** Unique business code e.g. PF-2026-001 */
  code?: string;
  portfolioType?:
    | "strategic"
    | "digital"
    | "operational"
    | "capital"
    | "it"
    | "other";
  status?:
    | "draft"
    | "submitted"
    | "under_review"
    | "returned"
    | "pending_approval"
    | "approved"
    | "active"
    | "on_hold"
    | "rejected"
    | "closed"
    | "archived";
  priority?: "critical" | "high" | "medium" | "low";
  health?: "green" | "amber" | "red" | "unknown";
  departmentId?: string;
  sponsorUserId?: string;
  fiscalYear?: number;
  startDate?: string;
  endDate?: string;
  governanceModel?: "pmo_central" | "federated" | "hybrid";
  currency?: "SAR" | "AED";
  plannedBudgetSar?: number;
  approvedBudgetSar?: number;
  allocatedBudgetSar?: number;
  actualSpendSar?: number;
  forecastSpendSar?: number;
  budgetNotes?: string;
  objectiveIds?: string[];
  expectedBenefits?: string;
  successMetrics?: string;
  teamUserIds?: string[];
  reviewComment?: string;
  rejectionReason?: string;
  holdReason?: string;
  closureReason?: string;
  submittedAt?: string;
  submittedByUserId?: string;
  approvedAt?: string;
  approvedByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdByUserId?: string;
}

export interface Initiative {
  id: string;
  organizationId: string;
  objectiveIds: string[];
  name: string;
  description: string;
  /** Responsible owner for the initiative */
  ownerUserId?: string;
  /** Parent portfolio — المبادرة تابعة لمحفظة */
  portfolioId?: string;
  /** Projects linked directly to the initiative (outside a program) */
  standaloneProjectIds: string[];
}

export interface Program {
  id: string;
  organizationId: string;
  portfolioId: string;
  /** Parent initiative — البرنامج تابع لمبادرة */
  initiativeId?: string;
  name: string;
  description: string;
  managerUserId: string;
}

export interface Project {
  id: string;
  organizationId: string;
  portfolioId?: string;
  programId?: string;
  /**
   * true = ليس تحت برنامج (قد يكون تحت محفظة أو مستقلاً تماماً بدون محفظة).
   * false = مندرج تحت برنامج عبر programId.
   */
  standalone: boolean;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  managerUserId: string;
  memberUserIds: string[];
  branchId: string;
  departmentId: string;
  budgetSar: number;
  spentSar: number;
  startDate: string;
  endDate: string;
  progress: number;
  createdAt: string;
}

/** مرحلة داخل المشروع (كانت تُعرض سابقاً كـ «معلم») */
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dueDate: string;
  status: StageStatus;
  /** يُزامَن مع status === completed للتوافق */
  completed: boolean;
  order: number;
}

/** فئة عمل تحت مرحلة */
export interface ProjectCategory {
  id: string;
  projectId: string;
  stageId: string;
  name: string;
  description: string;
  order: number;
}

export interface TaskItem {
  id: string;
  projectId: string;
  /** @deprecated استخدم categoryId — يُبقى للتوافق */
  milestoneId?: string;
  categoryId?: string;
  parentTaskId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeUserId?: string;
  startDate: string;
  dueDate: string;
  progress: number;
  createdAt: string;
}

export type WorkEntityType =
  | "project"
  | "stage"
  | "category"
  | "task"
  | "material";

export interface WorkComment {
  id: string;
  projectId: string;
  entityType: Exclude<WorkEntityType, "project">;
  entityId: string;
  authorUserId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkAttachment {
  id: string;
  projectId: string;
  entityType: WorkEntityType;
  /** مع entityType=project يكون مساوياً لـ projectId */
  entityId: string;
  name: string;
  sizeLabel: string;
  sizeBytes: number;
  mimeType: string;
  /** true عند وجود محتوى ملف في التخزين المحلي */
  hasFile: boolean;
  uploadedByUserId: string;
  createdAt: string;
}

export interface ProjectExpense {
  id: string;
  projectId: string;
  title: string;
  amountSar: number;
  date: string;
  categoryLabel: string;
  note: string;
  createdByUserId: string;
  createdAt: string;
}

export type ProjectActivityKind =
  | "note"
  | "status"
  | "stage"
  | "task"
  | "team"
  | "expense"
  | "document"
  | "material"
  | "comment";

export interface ProjectActivity {
  id: string;
  projectId: string;
  kind: ProjectActivityKind;
  title: string;
  detail: string;
  actorUserId: string;
  createdAt: string;
}

export type ProjectMaterialStatus =
  | "requested"
  | "ordered"
  | "received"
  | "consumed"
  | "cancelled";

export interface ProjectMaterial {
  id: string;
  projectId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCostSar: number;
  supplier: string;
  status: ProjectMaterialStatus;
  note: string;
  createdByUserId: string;
  createdAt: string;
}

export interface DemoInvite {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: CoreRoleId;
  projectId?: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  token: string;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  /** Demo-only plaintext password — never production */
  password: string;
  role: CoreRoleId | AnyRoleId;
  organizationId: string;
  branchId?: string;
  departmentId?: string;
  active?: boolean;
  mfaRequired?: boolean;
  /** External users limited to these project ids */
  scopedProjectIds?: string[];
}

export interface DemoSession {
  token: string;
  userId: string;
  organizationId: string;
  permissions: PermissionKey[];
  createdAt: string;
}

/** Unified strategic entity kinds for overview / relationships */
export type StrategicEntityType =
  | "portfolio"
  | "initiative"
  | "program"
  | "project";

export interface EntityRelationship {
  id: string;
  organizationId: string;
  sourceType: StrategicEntityType;
  sourceId: string;
  targetType: StrategicEntityType;
  targetId: string;
  relationshipType: RelationshipTypeKey;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipHistoryEvent {
  id: string;
  organizationId: string;
  relationshipId?: string;
  action: "created" | "updated" | "removed" | "ended";
  sourceType: StrategicEntityType;
  sourceId: string;
  targetType: StrategicEntityType;
  targetId: string;
  relationshipType: RelationshipTypeKey;
  reason?: string;
  userId?: string;
  createdAt: string;
}
