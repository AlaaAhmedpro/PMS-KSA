/** Bridge: Core PMS billing UI ↔ Super Admin localStorage (same-browser demo). */

import { getFormatLocale } from "./format";

export const ADMIN_BILLING_LS = {
  tenants: "pms_admin_tenants_v2",
  plans: "pms_admin_plans_v2",
  subscriptions: "pms_admin_subscriptions_v1",
  invoices: "pms_admin_invoices_v1",
  upgradeRequests: "pms_admin_upgrade_requests_v1",
  suspendedOrgs: "pms_core_suspended_orgs_v1",
} as const;

export const CORE_BILLING_PREFS_KEY = "pms_core_billing_prefs_v2";

export type BillingPlan = {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual?: number;
  seatsIncluded: number;
  features: string[];
  active: boolean;
  clientType?: string;
  limits?: {
    maxUsers: number;
    maxProjects: number;
    maxStorageGb: number;
    maxApiRequests: number;
  };
  entitlements?: Record<string, boolean>;
};

export type BillingOrganization = {
  id: string;
  name: string;
  organizationId?: string;
  planId: string;
  status: string;
  seats: number;
  usage?: {
    users: number;
    projects: number;
    storageGb: number;
    apiRequests: number;
  };
  renewalAt?: string;
  trialEndsAt?: string;
  city?: string;
};

export type BillingSubscription = {
  id: string;
  organizationId: string;
  planId: string;
  status: string;
  billingCycle: "monthly" | "annual";
  startAt: string;
  renewAt: string;
  mrrSar: number;
  history: { at: string; text: string }[];
};

export type BillingInvoice = {
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
  status: string;
  paidAt?: string;
};

export type UpgradeRequest = {
  id: string;
  organizationId: string;
  coreOrgId: string;
  fromPlanId: string;
  toPlanId: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
  note?: string;
  applyAt?: "immediate" | "renewal";
};

export type SavedPaymentCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
};

export type AltMethodState = {
  bank: {
    enabled: boolean;
    status: "idle" | "review" | "active";
    receiptName?: string;
    receiptDataUrl?: string;
  };
  apple_pay: { enabled: boolean };
  stc_pay: { enabled: boolean };
  fawry: { enabled: boolean };
};

export type BillingPrefs = {
  autoRenew: boolean;
  invoiceEmail: string;
  taxNumber: string;
  billingAddress: string;
  /** @deprecated use cards + defaultCardId */
  defaultCard: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    holderName?: string;
  } | null;
  cards: SavedPaymentCard[];
  defaultCardId: string | null;
  paymentFailure: {
    cardLast4: string;
    retryAt: string;
    accessUntil: string;
  } | null;
  altMethods: AltMethodState;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Fallback when Super Admin seed not yet written in this browser. */
const FALLBACK_PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "أساسي",
    description: " للشركات الصغيرة وفرق التنفيذ.",
    priceMonthly: 2490,
    priceAnnual: 24900,
    seatsIncluded: 25,
    features: ["محفظة مبسّطة", "مشاريع ومهام", "تقارير أساسية"],
    active: true,
    limits: {
      maxUsers: 25,
      maxProjects: 40,
      maxStorageGb: 50,
      maxApiRequests: 20000,
    },
  },
  {
    id: "professional",
    name: "احترافي",
    description: "للمؤسسات المتوسطة.",
    priceMonthly: 5990,
    priceAnnual: 59900,
    seatsIncluded: 75,
    features: ["محافظ وبرامج", "أهداف", "API"],
    active: true,
    limits: {
      maxUsers: 75,
      maxProjects: 200,
      maxStorageGb: 200,
      maxApiRequests: 100000,
    },
  },
  {
    id: "business",
    name: "أعمال",
    description: "لمكاتب إدارة المشاريع.",
    priceMonthly: 8990,
    priceAnnual: 89900,
    seatsIncluded: 150,
    features: ["مبادرات", "هوية مخصصة", "دعم أولوية"],
    active: true,
  },
  {
    id: "enterprise",
    name: "مؤسسي / حكومي",
    description: "للجهات الحكومية والمؤسسات الكبرى.",
    priceMonthly: 12990,
    priceAnnual: 129900,
    seatsIncluded: 500,
    features: ["SSO", "قاعدة مخصصة", "امتثال وحوكمة"],
    active: true,
    limits: {
      maxUsers: 2000,
      maxProjects: 5000,
      maxStorageGb: 2000,
      maxApiRequests: 1_000_000,
    },
  },
];

function fallbackTenant(coreOrgId: string, orgName: string): BillingOrganization {
  return {
    id: "t1",
    name: orgName || "شركة نماء للتطوير",
    organizationId: coreOrgId || "org-namaa",
    planId: "enterprise",
    status: "active",
    seats: 250,
    usage: { users: 48, projects: 19, storageGb: 86, apiRequests: 42000 },
    renewalAt: "2027-03-12T08:00:00.000Z",
    city: "الرياض",
  };
}

export function loadPlans(): BillingPlan[] {
  const plans = readJson<BillingPlan[]>(ADMIN_BILLING_LS.plans, []);
  return plans.length ? plans.filter((p) => p.active !== false) : FALLBACK_PLANS;
}

export function loadOrganizations(): BillingOrganization[] {
  return readJson<BillingOrganization[]>(ADMIN_BILLING_LS.tenants, []);
}

export function findTenantForCoreOrg(
  coreOrgId: string,
  orgName?: string,
): BillingOrganization {
  const list = loadOrganizations();
  const found =
    list.find((t) => t.organizationId === coreOrgId) ||
    list.find((t) => t.id === "t1" && coreOrgId === "org-namaa");
  return found || fallbackTenant(coreOrgId, orgName || "");
}

export function loadSubscriptionForTenant(
  tenantId: string,
): BillingSubscription | null {
  const list = readJson<BillingSubscription[]>(
    ADMIN_BILLING_LS.subscriptions,
    [],
  );
  const found = list.find((s) => s.organizationId === tenantId);
  if (found) return found;
  if (tenantId === "t1") {
    return {
      id: "sub-t1",
      organizationId: "t1",
      planId: "enterprise",
      status: "active",
      billingCycle: "annual",
      startAt: "2024-03-12T08:00:00.000Z",
      renewAt: "2027-03-12T08:00:00.000Z",
      mrrSar: 12990,
      history: [
        { at: "2024-03-12T08:00:00.000Z", text: "إنشاء اشتراك مؤسسي" },
        { at: "2026-03-12T08:00:00.000Z", text: "تجديد سنوي" },
      ],
    };
  }
  return null;
}

export function loadInvoicesForTenant(tenantId: string): BillingInvoice[] {
  const list = readJson<BillingInvoice[]>(ADMIN_BILLING_LS.invoices, []);
  const scoped = list.filter((i) => i.organizationId === tenantId);
  if (scoped.length) return scoped;
  if (tenantId === "t1") {
    return [
      {
        id: "inv1",
        number: "INV-2026-00141",
        organizationId: "t1",
        subscriptionId: "sub-t1",
        issueDate: "2026-09-01",
        dueDate: "2026-09-15",
        subtotalSar: 12990,
        vatRate: 0.15,
        vatSar: 1948.5,
        totalSar: 14938.5,
        status: "paid",
        paidAt: "2026-09-03T11:00:00.000Z",
      },
    ];
  }
  return [];
}

export function updateInvoiceStatus(
  invoiceId: string,
  status: string,
): boolean {
  const list = readJson<BillingInvoice[]>(ADMIN_BILLING_LS.invoices, []);
  if (!list.length) return false;
  const next = list.map((inv) =>
    inv.id === invoiceId
      ? {
          ...inv,
          status,
          paidAt: status === "paid" ? new Date().toISOString() : inv.paidAt,
        }
      : inv,
  );
  writeJson(ADMIN_BILLING_LS.invoices, next);
  return true;
}

export function setSubscriptionAutoRenewNote(
  tenantId: string,
  autoRenew: boolean,
): void {
  const list = readJson<BillingSubscription[]>(
    ADMIN_BILLING_LS.subscriptions,
    [],
  );
  if (!list.length) return;
  const next = list.map((s) =>
    s.organizationId === tenantId
      ? {
          ...s,
          history: [
            {
              at: new Date().toISOString(),
              text: autoRenew
                ? "تفعيل التجديد التلقائي من بوابة المنشأة"
                : "إيقاف التجديد التلقائي من بوابة المنشأة",
            },
            ...s.history,
          ],
        }
      : s,
  );
  writeJson(ADMIN_BILLING_LS.subscriptions, next);
}

export function loadUpgradeRequests(coreOrgId: string): UpgradeRequest[] {
  return readJson<UpgradeRequest[]>(ADMIN_BILLING_LS.upgradeRequests, []).filter(
    (r) => r.coreOrgId === coreOrgId,
  );
}

export function submitUpgradeRequest(input: {
  tenantId: string;
  coreOrgId: string;
  fromPlanId: string;
  toPlanId: string;
  note?: string;
  applyAt?: "immediate" | "renewal";
}): UpgradeRequest {
  const list = readJson<UpgradeRequest[]>(ADMIN_BILLING_LS.upgradeRequests, []);
  const req: UpgradeRequest = {
    id: `up-${crypto.randomUUID().slice(0, 8)}`,
    organizationId: input.tenantId,
    coreOrgId: input.coreOrgId,
    fromPlanId: input.fromPlanId,
    toPlanId: input.toPlanId,
    status: "pending",
    createdAt: new Date().toISOString(),
    note: input.note,
    applyAt: input.applyAt || "immediate",
  };
  writeJson(ADMIN_BILLING_LS.upgradeRequests, [req, ...list]);
  return req;
}

export function cancelUpgradeRequest(requestId: string): boolean {
  const list = readJson<UpgradeRequest[]>(ADMIN_BILLING_LS.upgradeRequests, []);
  const idx = list.findIndex((r) => r.id === requestId);
  if (idx < 0) return false;
  if (list[idx].status !== "pending") return false;
  list[idx] = { ...list[idx], status: "cancelled" };
  writeJson(ADMIN_BILLING_LS.upgradeRequests, list);
  return true;
}

export function defaultBillingPrefs(email?: string): BillingPrefs {
  const cards: SavedPaymentCard[] = [
    {
      id: "card-visa",
      brand: "Visa",
      last4: "4242",
      expMonth: 11,
      expYear: 2026,
      holderName: "AHMED M. SALEM",
    },
    {
      id: "card-mc",
      brand: "Mastercard",
      last4: "5521",
      expMonth: 8,
      expYear: 2027,
      holderName: "AHMED M. SALEM",
    },
    {
      id: "card-mada",
      brand: "مدى",
      last4: "9037",
      expMonth: 3,
      expYear: 2028,
      holderName: "AHMED M. SALEM",
    },
  ];
  const primary = cards[0];
  return {
    autoRenew: true,
    invoiceEmail: email || "",
    taxNumber: "300000000000003",
    billingAddress: "الرياض، المملكة العربية السعودية",
    defaultCard: {
      brand: primary.brand,
      last4: primary.last4,
      expMonth: primary.expMonth,
      expYear: primary.expYear,
      holderName: primary.holderName,
    },
    cards,
    defaultCardId: primary.id,
    paymentFailure: {
      cardLast4: "4242",
      retryAt: "2026-11-05",
      accessUntil: "7 أيام",
    },
    altMethods: {
      bank: { enabled: true, status: "review" },
      apple_pay: { enabled: false },
      stc_pay: { enabled: false },
      fawry: { enabled: false },
    },
  };
}

function normalizeBillingPrefs(
  raw: Partial<BillingPrefs>,
  email?: string,
): BillingPrefs {
  const base = defaultBillingPrefs(email);
  let cards = raw.cards?.length ? raw.cards : base.cards;
  let defaultCardId = raw.defaultCardId ?? base.defaultCardId;
  if ((!raw.cards || raw.cards.length === 0) && raw.defaultCard) {
    const id = "card-legacy";
    cards = [
      {
        id,
        brand: raw.defaultCard.brand,
        last4: raw.defaultCard.last4,
        expMonth: raw.defaultCard.expMonth,
        expYear: raw.defaultCard.expYear,
        holderName: raw.defaultCard.holderName || "CARD HOLDER",
      },
    ];
    defaultCardId = id;
  }
  const primary =
    cards.find((c) => c.id === defaultCardId) || cards[0] || null;
  return {
    autoRenew: raw.autoRenew ?? base.autoRenew,
    invoiceEmail: raw.invoiceEmail ?? base.invoiceEmail,
    taxNumber: raw.taxNumber ?? base.taxNumber,
    billingAddress: raw.billingAddress ?? base.billingAddress,
    cards,
    defaultCardId: primary?.id || null,
    defaultCard: primary
      ? {
          brand: primary.brand,
          last4: primary.last4,
          expMonth: primary.expMonth,
          expYear: primary.expYear,
          holderName: primary.holderName,
        }
      : null,
    paymentFailure:
      raw.paymentFailure === undefined
        ? base.paymentFailure
        : raw.paymentFailure,
    altMethods: {
      ...base.altMethods,
      ...raw.altMethods,
      bank: { ...base.altMethods.bank, ...raw.altMethods?.bank },
    },
  };
}

export function loadBillingPrefs(
  coreOrgId: string,
  email?: string,
): BillingPrefs {
  const all = readJson<Record<string, Partial<BillingPrefs>>>(
    CORE_BILLING_PREFS_KEY,
    {},
  );
  return normalizeBillingPrefs(all[coreOrgId] || {}, email);
}

export function saveBillingPrefs(
  coreOrgId: string,
  prefs: BillingPrefs,
): void {
  const all = readJson<Record<string, BillingPrefs>>(CORE_BILLING_PREFS_KEY, {});
  all[coreOrgId] = prefs;
  writeJson(CORE_BILLING_PREFS_KEY, all);
}

export function isCoreOrgSuspended(coreOrgId: string): boolean {
  const ids = readJson<string[]>(ADMIN_BILLING_LS.suspendedOrgs, []);
  return ids.includes(coreOrgId);
}

export function formatSar(amount: number): string {
  const n = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return getFormatLocale() === "en" ? `${n} SAR` : `${n} ر.س`;
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  open: "مستحقة",
  paid: "مدفوعة",
  failed: "فشل الدفع",
  refunded: "مستردة",
  void: "ملغاة",
};

export const SUB_STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  trial: "تجريبي",
  past_due: "متأخر السداد",
  expired: "منتهٍ",
  cancelled: "ملغى",
  suspended: "معلّق",
};
