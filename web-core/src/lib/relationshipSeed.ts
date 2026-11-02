import type {
  EntityRelationship,
  RelationshipHistoryEvent,
} from "../models/domain";
import { SEED_ORG } from "./hierarchySeed";

const now = "2026-10-28T10:00:00.000Z";

function rel(
  partial: Omit<EntityRelationship, "organizationId" | "isActive" | "createdAt" | "updatedAt"> & {
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  },
): EntityRelationship {
  return {
    organizationId: SEED_ORG.id,
    isActive: partial.isActive ?? true,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    ...partial,
  };
}

/**
 * Scenario coverage:
 * A — Standard hierarchy (portfolio → initiative → program → projects)
 * B — Project aligned with two initiatives (prj-portal)
 * C — Independent project (prj-orphan-training)
 * D — Project directly aligned with portfolio (prj-nca-audit → pf-digital)
 * E — Project depends on another (prj-portal depends_on prj-2)
 * F — History of program move (prj-3 related history)
 * G — Duplicate/invalid validated at runtime (seed includes one inactive ended edge)
 */
export const SEED_RELATIONSHIPS: EntityRelationship[] = [
  // A: pf-infra → ini-1 → prg-housing → projects
  rel({
    id: "rel-a1",
    sourceType: "portfolio",
    sourceId: "pf-infra",
    targetType: "initiative",
    targetId: "ini-1",
    relationshipType: "contains",
    description: "مبادرة المياه ضمن محفظة البنية التحتية",
  }),
  rel({
    id: "rel-a2",
    sourceType: "initiative",
    sourceId: "ini-1",
    targetType: "program",
    targetId: "prg-housing",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-a3",
    sourceType: "program",
    sourceId: "prg-housing",
    targetType: "project",
    targetId: "prj-1",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-a4",
    sourceType: "program",
    sourceId: "prg-housing",
    targetType: "project",
    targetId: "prj-housing-abha",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-a5",
    sourceType: "initiative",
    sourceId: "ini-1",
    targetType: "project",
    targetId: "prj-standalone-1",
    relationshipType: "aligns_with",
    description: "مواءمة مباشرة مع محطة جدة",
  }),

  // Digital chain
  rel({
    id: "rel-d1",
    sourceType: "portfolio",
    sourceId: "pf-digital",
    targetType: "initiative",
    targetId: "ini-2",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-d2",
    sourceType: "initiative",
    sourceId: "ini-2",
    targetType: "program",
    targetId: "prg-digital",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-d3",
    sourceType: "program",
    sourceId: "prg-digital",
    targetType: "project",
    targetId: "prj-2",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-d4",
    sourceType: "program",
    sourceId: "prg-digital",
    targetType: "project",
    targetId: "prj-3",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-d5",
    sourceType: "program",
    sourceId: "prg-digital",
    targetType: "project",
    targetId: "prj-portal",
    relationshipType: "contains",
  }),

  // Cyber
  rel({
    id: "rel-c1",
    sourceType: "portfolio",
    sourceId: "pf-digital",
    targetType: "initiative",
    targetId: "ini-3",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-c2",
    sourceType: "initiative",
    sourceId: "ini-3",
    targetType: "program",
    targetId: "prg-cyber",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-c3",
    sourceType: "program",
    sourceId: "prg-cyber",
    targetType: "project",
    targetId: "prj-soc",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-c4",
    sourceType: "initiative",
    sourceId: "ini-3",
    targetType: "project",
    targetId: "prj-nca-audit",
    relationshipType: "aligns_with",
  }),

  // B: multi-initiative alignment for same project
  rel({
    id: "rel-b1",
    sourceType: "project",
    sourceId: "prj-portal",
    targetType: "initiative",
    targetId: "ini-2",
    relationshipType: "aligns_with",
    description: "مواءمة مع مبادرة العقود الرقمية",
  }),
  rel({
    id: "rel-b2",
    sourceType: "project",
    sourceId: "prj-portal",
    targetType: "initiative",
    targetId: "ini-3",
    relationshipType: "aligns_with",
    description: "مواءمة إضافية مع الامتثال السيبراني",
  }),

  // D: direct strategic portfolio alignment
  rel({
    id: "rel-dir1",
    sourceType: "project",
    sourceId: "prj-nca-audit",
    targetType: "portfolio",
    targetId: "pf-digital",
    relationshipType: "aligns_with",
    description: "مواءمة مباشرة مع المحفظة دون احتواء برنامج",
  }),
  rel({
    id: "rel-dir2",
    sourceType: "portfolio",
    sourceId: "pf-infra",
    targetType: "project",
    targetId: "prj-standalone-1",
    relationshipType: "contains",
    description: "احتواء مستقل تحت المحفظة",
  }),
  rel({
    id: "rel-dir3",
    sourceType: "portfolio",
    sourceId: "pf-infra",
    targetType: "project",
    targetId: "prj-roads-jeddah",
    relationshipType: "contains",
  }),

  // Water / energy / community containment
  rel({
    id: "rel-w1",
    sourceType: "portfolio",
    sourceId: "pf-infra",
    targetType: "program",
    targetId: "prg-water",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-w2",
    sourceType: "program",
    sourceId: "prg-water",
    targetType: "project",
    targetId: "prj-water-east",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-w3",
    sourceType: "program",
    sourceId: "prg-water",
    targetType: "project",
    targetId: "prj-water-madinah",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-e1",
    sourceType: "portfolio",
    sourceId: "pf-energy",
    targetType: "initiative",
    targetId: "ini-4",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-e2",
    sourceType: "initiative",
    sourceId: "ini-4",
    targetType: "program",
    targetId: "prg-solar",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-e3",
    sourceType: "program",
    sourceId: "prg-solar",
    targetType: "project",
    targetId: "prj-solar-hq",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-e4",
    sourceType: "program",
    sourceId: "prg-solar",
    targetType: "project",
    targetId: "prj-solar-jeddah",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-e5",
    sourceType: "portfolio",
    sourceId: "pf-energy",
    targetType: "project",
    targetId: "prj-energy-study",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-cm1",
    sourceType: "portfolio",
    sourceId: "pf-community",
    targetType: "program",
    targetId: "prg-community",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-cm2",
    sourceType: "program",
    sourceId: "prg-community",
    targetType: "project",
    targetId: "prj-center-dammam",
    relationshipType: "contains",
  }),
  rel({
    id: "rel-cm3",
    sourceType: "program",
    sourceId: "prg-community",
    targetType: "project",
    targetId: "prj-center-madinah",
    relationshipType: "contains",
  }),

  // Standalone initiative alignments (C-adjacent)
  rel({
    id: "rel-si1",
    sourceType: "initiative",
    sourceId: "ini-5",
    targetType: "project",
    targetId: "prj-callcenter",
    relationshipType: "aligns_with",
  }),
  rel({
    id: "rel-si2",
    sourceType: "initiative",
    sourceId: "ini-5",
    targetType: "project",
    targetId: "prj-survey",
    relationshipType: "aligns_with",
  }),

  // E: dependencies
  rel({
    id: "rel-dep1",
    sourceType: "project",
    sourceId: "prj-portal",
    targetType: "project",
    targetId: "prj-2",
    relationshipType: "depends_on",
    description: "البوابة تعتمد على منصة العقود",
  }),
  rel({
    id: "rel-dep2",
    sourceType: "project",
    sourceId: "prj-soc",
    targetType: "project",
    targetId: "prj-nca-audit",
    relationshipType: "depends_on",
    description: "SOC يعتمد على نتائج تقييم الفجوات",
  }),

  // Related-to associations
  rel({
    id: "rel-rt1",
    sourceType: "project",
    sourceId: "prj-callcenter",
    targetType: "project",
    targetId: "prj-survey",
    relationshipType: "related_to",
    description: "تكامل قياس الرضا مع مركز الاتصال",
  }),

  // F: ended containment (history) — project previously under another program
  rel({
    id: "rel-hist1",
    sourceType: "program",
    sourceId: "prg-cyber",
    targetType: "project",
    targetId: "prj-3",
    relationshipType: "contains",
    isActive: false,
    effectiveFrom: "2025-04-01",
    effectiveTo: "2025-08-01",
    description: "ارتباط سابق قبل النقل لبرنامج المنصات",
    createdAt: "2025-04-01T08:00:00.000Z",
    updatedAt: "2025-08-01T08:00:00.000Z",
  }),
];

export const SEED_RELATIONSHIP_HISTORY: RelationshipHistoryEvent[] = [
  {
    id: "rh-1",
    organizationId: SEED_ORG.id,
    relationshipId: "rel-a3",
    action: "created",
    sourceType: "program",
    sourceId: "prg-housing",
    targetType: "project",
    targetId: "prj-1",
    relationshipType: "contains",
    reason: "إدراج المشروع تحت برنامج الإسكان",
    userId: "u-org-admin",
    createdAt: "2026-01-05T09:30:00.000Z",
  },
  {
    id: "rh-2",
    organizationId: SEED_ORG.id,
    relationshipId: "rel-b2",
    action: "created",
    sourceType: "project",
    sourceId: "prj-portal",
    targetType: "initiative",
    targetId: "ini-3",
    relationshipType: "aligns_with",
    reason: "مواءمة إضافية مع الامتثال",
    userId: "u-pm",
    createdAt: "2026-03-10T11:00:00.000Z",
  },
  {
    id: "rh-3",
    organizationId: SEED_ORG.id,
    relationshipId: "rel-hist1",
    action: "removed",
    sourceType: "program",
    sourceId: "prg-cyber",
    targetType: "project",
    targetId: "prj-3",
    relationshipType: "contains",
    reason: "نقل المشروع إلى برنامج المنصات المؤسسية مع الإبقاء على الهوية والبيانات",
    userId: "u-pm",
    createdAt: "2025-08-01T08:00:00.000Z",
  },
  {
    id: "rh-4",
    organizationId: SEED_ORG.id,
    relationshipId: "rel-d4",
    action: "created",
    sourceType: "program",
    sourceId: "prg-digital",
    targetType: "project",
    targetId: "prj-3",
    relationshipType: "contains",
    reason: "الارتباط الجديد بعد النقل",
    userId: "u-pm",
    createdAt: "2025-08-01T08:05:00.000Z",
  },
  {
    id: "rh-5",
    organizationId: SEED_ORG.id,
    relationshipId: "rel-dep1",
    action: "created",
    sourceType: "project",
    sourceId: "prj-portal",
    targetType: "project",
    targetId: "prj-2",
    relationshipType: "depends_on",
    reason: "اعتماد تسليم العقود قبل إطلاق البوابة",
    userId: "u-pm",
    createdAt: "2026-02-25T10:00:00.000Z",
  },
];
