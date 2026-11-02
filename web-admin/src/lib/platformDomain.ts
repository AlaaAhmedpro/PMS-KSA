/** Domain model for Super Admin SaaS platform (demo). */

import type { OrgClientType, OrgEnabledModules } from "./types";

export type PlatformRoleId =
  | "super_admin"
  | "platform_admin"
  | "finance_admin"
  | "support_agent"
  | "readonly_admin";

export type OrgDeploymentType = "shared" | "dedicated" | "dedicated_hosting";
export type OrgCustomerKind =
  | "standard"
  | "enterprise"
  | "government"
  | "semi_government";

/** Organization administrative lifecycle — independent of subscription */
export type OrganizationStatus =
  | "pending"
  | "provisioning"
  | "active"
  | "suspended"
  | "archived";

/** Commercial subscription lifecycle — independent of org status */
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "expired"
  | "cancelled";

export type ProvisioningStatus = "idle" | "running" | "succeeded" | "failed";

export type InvoiceStatus = "draft" | "open" | "paid" | "failed" | "refunded" | "void";

export type LeadStatus =
  | "new"
  | "qualified"
  | "demo"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "pending_customer"
  | "escalated"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "normal" | "high" | "critical";

export type EntitlementKey =
  | "portfolio"
  | "program"
  | "initiative"
  | "strategicObjectives"
  | "advancedReporting"
  | "resourceManagement"
  | "customWorkflows"
  | "advancedRbac"
  | "apiAccess"
  | "aiFeatures"
  | "advancedAnalytics"
  | "customBranding"
  | "sso"
  | "dedicatedDatabase"
  | "prioritySupport";

export type PlanLimits = {
  maxUsers: number;
  maxProjects: number;
  maxStorageGb: number;
  maxApiRequests: number;
};

export type PlanEntitlements = Record<EntitlementKey, boolean>;

export type LimitOverrides = Partial<PlanLimits> & { reason?: string; at?: string };

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  workflow: string;
  clientType: OrgClientType;
  priceMonthly: number;
  priceAnnual: number;
  trialDays: number;
  seatsIncluded: number;
  limits: PlanLimits;
  entitlements: PlanEntitlements;
  enabledModules: OrgEnabledModules;
  features: string[];
  active: boolean;
  billingCycleDefault: "monthly" | "annual";
}

export interface OrganizationUsage {
  users: number;
  projects: number;
  storageGb: number;
  apiRequests: number;
  portfolios?: number;
  programs?: number;
}

export interface OrgSuspension {
  reason: string;
  category: string;
  notes?: string;
  at: string;
  notifyAdmin?: boolean;
}

export interface SupportAccessSession {
  id: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  reason: string;
  readOnly: boolean;
  startedAt: string;
  endsAt: string;
  endedAt?: string;
}

export interface OrgTenantUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: "org_admin" | "member" | "viewer";
  status: "active" | "invited" | "blocked";
  jobTitle?: string;
  lastActiveAt?: string;
}

export interface PlatformOrganization {
  id: string;
  name: string;
  legalName?: string;
  logoInitials: string;
  sector: string;
  industry: string;
  country: string;
  city: string;
  website?: string;
  crNumber?: string;
  vatNumber?: string;
  nationalAddress?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  accountManagerName?: string;
  customerKind: OrgCustomerKind;
  clientType: OrgClientType;
  deploymentType: OrgDeploymentType;
  planId: string;
  status: OrganizationStatus;
  provisioningStatus: ProvisioningStatus;
  seats: number;
  usage: OrganizationUsage;
  limitOverrides?: LimitOverrides;
  createdAt: string;
  renewalAt?: string;
  trialEndsAt?: string;
  organizationId?: string;
  orgAdminEmail?: string;
  orgAdminName?: string;
  enabledModules: OrgEnabledModules;
  notes?: string;
  suspension?: OrgSuspension;
  settings?: {
    language: "ar" | "en";
    timezone: string;
    notifyBilling: boolean;
  };
}

/** @deprecated alias */
export type PlatformTenant = PlatformOrganization & { usedSeats: number };

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: "monthly" | "annual";
  startAt: string;
  renewAt: string;
  endAt?: string;
  cancelAt?: string;
  mrrSar: number;
  customPriceMonthly?: number;
  history: { at: string; text: string }[];
}

export interface Invoice {
  id: string;
  number: string;
  organizationId: string;
  subscriptionId: string;
  issueDate: string;
  dueDate: string;
  subtotalSar: number;
  vatRate: number;
  vatSar: number;
  totalSar: number;
  status: InvoiceStatus;
  paidAt?: string;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  companySize: string;
  customerType: OrgCustomerKind;
  interestedPlanId?: string;
  source: string;
  status: LeadStatus;
  assigneeName?: string;
  notes: string;
  followUpAt?: string;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  at: string;
  authorName: string;
  authorKind: "agent" | "customer" | "system";
  text: string;
}

export interface SupportTicket {
  id: string;
  number: string;
  organizationId: string;
  requesterName: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  subject: string;
  messages: SupportMessage[];
}

export interface PlatformInvite {
  id: string;
  email: string;
  name: string;
  role: PlatformRoleId;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  userName: string;
  at: string;
  ip: string;
  success: boolean;
  detail: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  organizationId?: string;
  ip: string;
  before?: string;
  after?: string;
  result: "success" | "denied" | "failed";
}

export interface MonitoringSnapshot {
  apiAvailabilityPct: number;
  avgResponseMs: number;
  failedJobs24h: number;
  errorRatePct: number;
  storageUsedTb: number;
  dbHealth: "healthy" | "degraded" | "down";
  integrations: { name: string; status: "up" | "down" | "degraded" }[];
  recentErrors: { at: string; code: string; message: string }[];
}

export interface PlatformSettings {
  platformName: string;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLanguage: "ar" | "en";
  vatRate: number;
  maintenanceMode: boolean;
  featureFlags: Record<string, boolean>;
  emailFrom: string;
  supportEmail: string;
}

export const ENTITLEMENT_LABELS: Record<EntitlementKey, string> = {
  portfolio: "إدارة المحافظ",
  program: "إدارة البرامج",
  initiative: "المبادرات",
  strategicObjectives: "التخطيط الاستراتيجي",
  advancedReporting: "تقارير المشاريع المتقدمة",
  resourceManagement: "إدارة الموارد",
  customWorkflows: "مسارات عمل مخصصة",
  advancedRbac: "صلاحيات متقدمة",
  apiAccess: "واجهة برمجة التطبيقات",
  aiFeatures: "ميزات الذكاء الاصطناعي",
  advancedAnalytics: "تحليلات متقدمة",
  customBranding: "هوية مخصصة",
  sso: "تسجيل دخول موحّد SSO",
  dedicatedDatabase: "قاعدة بيانات مخصصة",
  prioritySupport: "دعم أولوية",
};

export const ORG_STATUS_LABELS: Record<OrganizationStatus, string> = {
  pending: "قيد المراجعة",
  provisioning: "جارٍ التجهيز",
  active: "نشط",
  suspended: "معلّق",
  archived: "مؤرشف",
};

export const SUB_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: "تجريبي",
  active: "نشط",
  past_due: "متأخر السداد",
  expired: "منتهٍ",
  cancelled: "ملغى",
};

export const CUSTOMER_KIND_LABELS: Record<OrgCustomerKind, string> = {
  standard: "شركة",
  enterprise: "مؤسسة",
  government: "حكومي",
  semi_government: "شبه حكومي",
};

export const DEPLOYMENT_LABELS: Record<OrgDeploymentType, string> = {
  shared: "مشترك (SaaS)",
  dedicated: "قاعدة بيانات مخصصة",
  dedicated_hosting: "استضافة مخصصة",
};

export const PLATFORM_ROLE_LABELS: Record<PlatformRoleId, string> = {
  super_admin: "مدير أعلى",
  platform_admin: "مدير منصة",
  finance_admin: "مدير مالي",
  support_agent: "وكيل دعم",
  readonly_admin: "عرض فقط",
};

export function entitlementsToModules(e: PlanEntitlements): OrgEnabledModules {
  return {
    portfolio: !!e.portfolio,
    program: !!e.program,
    initiative: !!e.initiative,
    strategicObjectives: !!e.strategicObjectives,
  };
}

export function effectiveLimits(
  plan: SubscriptionPlan | undefined,
  overrides?: LimitOverrides,
): PlanLimits {
  const base = plan?.limits || {
    maxUsers: 25,
    maxProjects: 40,
    maxStorageGb: 50,
    maxApiRequests: 20000,
  };
  return {
    maxUsers: overrides?.maxUsers ?? base.maxUsers,
    maxProjects: overrides?.maxProjects ?? base.maxProjects,
    maxStorageGb: overrides?.maxStorageGb ?? base.maxStorageGb,
    maxApiRequests: overrides?.maxApiRequests ?? base.maxApiRequests,
  };
}

export function formatSar(amount: number): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}
