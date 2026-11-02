import type { OrgClientType, OrgEnabledModules } from "./types";

export type OrgModuleKey = keyof OrgEnabledModules;

export const ALL_MODULES_ON: OrgEnabledModules = {
  portfolio: true,
  program: true,
  initiative: true,
  strategicObjectives: true,
};

export const ALL_MODULES_OFF: OrgEnabledModules = {
  portfolio: false,
  program: false,
  initiative: false,
  strategicObjectives: false,
};

export const MODULE_LABELS: Record<OrgModuleKey, string> = {
  portfolio: "المحفظة",
  program: "البرنامج",
  initiative: "المبادرة",
  strategicObjectives: "الأهداف الاستراتيجية",
};

export const MODULE_DESCRIPTIONS: Record<OrgModuleKey, string> = {
  portfolio: "الصورة الأشمل لاختيار الأولويات وإدارة الاستثمارات.",
  program: "مجموعة مشاريع مترابطة. يتطلب تفعيل المحفظة.",
  initiative: "توجه استراتيجي يدعم الأهداف وقد يرتبط ببرنامج أو مشاريع مستقلة.",
  strategicObjectives: "مستهدفات الجهة — تُفعَّل مع المبادرات كحزمة واحدة.",
};

export const CLIENT_TYPE_META: Record<
  OrgClientType,
  {
    label: string;
    shortLabel: string;
    description: string;
    workflow: string;
    modules: OrgEnabledModules;
    defaultFeatures: string[];
  }
> = {
  small: {
    label: "شركة صغيرة",
    shortLabel: "شركة",
    description: "تنفيذ مباشر: مشاريع ومهام ومعالم فقط.",
    workflow: "مشروع → مهام ومعالم",
    modules: { ...ALL_MODULES_OFF },
    defaultFeatures: [
      "مشاريع ومهام غير محدودة",
      "معالم Deliverables",
      "لوحة مؤشرات تنفيذية",
      "تقارير أساسية",
    ],
  },
  enterprise: {
    label: "مؤسسة / شركة كبيرة",
    shortLabel: "مؤسسة",
    description: "محافظ وبرامج لتجميع المشاريع وإدارة الاستثمارات.",
    workflow: "محفظة → برنامج أو مشاريع مستقلة → مهام",
    modules: {
      portfolio: true,
      program: true,
      initiative: false,
      strategicObjectives: false,
    },
    defaultFeatures: [
      "كل ميزات الشركة الصغيرة",
      "محافظ المشاريع",
      "البرامج",
      "مشاريع مستقلة تحت المحفظة",
      "أرشيف إلكتروني",
      "تكاملات جاهزة",
    ],
  },
  government: {
    label: "جهة حكومية",
    shortLabel: "حكومي",
    description:
      "أهداف ومبادرات ومحافظ وبرامج مع مشاريع تحت برنامج أو مستقلة.",
    workflow: "أهداف ← مبادرات · محفظة → برامج/مستقلة → مشاريع → مهام",
    modules: { ...ALL_MODULES_ON },
    defaultFeatures: [
      "كل ميزات المؤسسة",
      "الأهداف الاستراتيجية",
      "المبادرات والحوكمة",
      "خريطة الهيكل الشجري",
      "تقارير عليا وامتثال",
      "SLA ودعم مخصص",
    ],
  },
};

export function normalizeOrgModules(
  input: Partial<OrgEnabledModules> | undefined | null,
): OrgEnabledModules {
  const next: OrgEnabledModules = {
    portfolio: !!input?.portfolio,
    program: !!input?.program,
    initiative: !!input?.initiative,
    strategicObjectives: !!input?.strategicObjectives,
  };
  if (next.program && !next.portfolio) next.portfolio = true;
  if (next.initiative || next.strategicObjectives) {
    next.initiative = true;
    next.strategicObjectives = true;
  }
  return next;
}

export function inferClientType(
  modules: OrgEnabledModules,
  explicit?: OrgClientType | null,
): OrgClientType {
  if (explicit === "small" || explicit === "enterprise" || explicit === "government") {
    return explicit;
  }
  if (modules.initiative || modules.strategicObjectives) return "government";
  if (modules.portfolio || modules.program) return "enterprise";
  return "small";
}

export function modulesForClientType(type: OrgClientType): OrgEnabledModules {
  return { ...CLIENT_TYPE_META[type].modules };
}

const CORE_ORGS_KEY = "pms_core_organizations_v1";

/** Demo sync: push tenant modules into web-core orgs in the same browser. */
export function syncTenantModulesToCore(input: {
  organizationId: string;
  name: string;
  sector: string;
  clientType: OrgClientType;
  enabledModules: OrgEnabledModules;
}): void {
  try {
    const raw = localStorage.getItem(CORE_ORGS_KEY);
    const list: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((o) => o.id === input.organizationId);
    const row = {
      id: input.organizationId,
      name: input.name,
      sector: input.sector,
      city: "الرياض",
      active: true,
      createdAt: new Date().toISOString(),
      clientType: input.clientType,
      enabledModules: normalizeOrgModules(input.enabledModules),
    };
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...row };
    } else {
      list.push(row);
    }
    localStorage.setItem(CORE_ORGS_KEY, JSON.stringify(list));
  } catch {
    /* ignore cross-app sync failures in demo */
  }
}
