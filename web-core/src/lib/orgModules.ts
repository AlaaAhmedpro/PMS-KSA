import type {
  OrgClientType,
  OrgEnabledModules,
  OrgModuleKey,
  Organization,
  Project,
} from "../models/domain";

export type { OrgEnabledModules, OrgModuleKey, OrgClientType };

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

/** موضع المشروع في الشجرة حسب الرسمة */
export type ProjectPlacement =
  | "under_program"
  | "portfolio_standalone"
  | "fully_independent";

export function getProjectPlacement(project: Project): ProjectPlacement {
  if (project.programId) return "under_program";
  if (project.portfolioId) return "portfolio_standalone";
  return "fully_independent";
}

export const PROJECT_PLACEMENT_LABELS: Record<ProjectPlacement, string> = {
  under_program: "تحت برنامج",
  portfolio_standalone: "مستقل تحت محفظة",
  fully_independent: "مستقل بدون محفظة",
};

export type ModulePresetId = "small" | "large" | "government" | "enterprise";

export const CLIENT_TYPE_META: Record<
  OrgClientType,
  {
    label: string;
    shortLabel: string;
    description: string;
    workflow: string;
    modules: OrgEnabledModules;
  }
> = {
  small: {
    label: "شركة صغيرة",
    shortLabel: "شركة",
    description:
      "محفظة مبسّطة مع مشاريع ومهام — مسار اعتماد واحد دون طبقات حوكمة ثقيلة.",
    workflow: "محفظة (اختياري) → مشروع → مهام ومعالم",
    modules: {
      portfolio: true,
      program: false,
      initiative: false,
      strategicObjectives: false,
    },
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
      strategicObjectives: true,
    },
  },
  government: {
    label: "جهة حكومية",
    shortLabel: "حكومي",
    description:
      "أهداف ومبادرات ومحافظ وبرامج مع مشاريع تحت برنامج أو مستقلة.",
    workflow:
      "أهداف ← مبادرات · محفظة → برامج/مستقلة → مشاريع → مهام",
    modules: { ...ALL_MODULES_ON },
  },
};

/** Compat with older preset id `large` */
export const MODULE_PRESETS: Record<
  "small" | "large" | "government",
  (typeof CLIENT_TYPE_META)[OrgClientType]
> = {
  small: CLIENT_TYPE_META.small,
  large: CLIENT_TYPE_META.enterprise,
  government: CLIENT_TYPE_META.government,
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

  if (next.program && !next.portfolio) {
    next.portfolio = true;
  }

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

export function withOrgModules(org: Organization): Organization {
  const enabledModules = normalizeOrgModules(
    org.enabledModules ?? ALL_MODULES_ON,
  );
  const clientType = inferClientType(enabledModules, org.clientType);
  return {
    ...org,
    clientType,
    enabledModules,
  };
}

export function migrateOrganizations(orgs: Organization[]): Organization[] {
  // Policy normalization is applied in Auth / useOrgPortfolioPolicy to avoid
  // a circular import with orgPortfolioPolicy ↔ domain.
  return orgs.map(withOrgModules);
}
