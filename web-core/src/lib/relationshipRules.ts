import type {
  EntityRelationship,
  RelationshipTypeKey,
  StrategicEntityType,
} from "../models/domain";

export interface RelationshipTypeDefinition {
  key: RelationshipTypeKey;
  nameAr: string;
  descriptionAr: string;
  allowedSources: StrategicEntityType[];
  allowedTargets: StrategicEntityType[];
  isDirectional: boolean;
  isHierarchical: boolean;
  allowCycles: boolean;
  /** Max active edges of this type from one source (null = unlimited) */
  maxFromSource: number | null;
  /** Visual treatment for diagrams */
  visual: "containment" | "alignment" | "dependency" | "association";
}

export const RELATIONSHIP_TYPES: RelationshipTypeDefinition[] = [
  {
    key: "contains",
    nameAr: "يحتوي",
    descriptionAr: "علاقة احتواء تنظيمية (محفظة/مبادرة/برنامج ← تابع).",
    allowedSources: ["portfolio", "initiative", "program"],
    allowedTargets: ["initiative", "program", "project"],
    isDirectional: true,
    isHierarchical: true,
    allowCycles: false,
    maxFromSource: null,
    visual: "containment",
  },
  {
    key: "aligns_with",
    nameAr: "يتوافق مع",
    descriptionAr: "مواءمة استراتيجية اختيارية دون ملكية تنظيمية.",
    allowedSources: ["project", "program", "initiative"],
    allowedTargets: ["initiative", "portfolio", "program"],
    isDirectional: true,
    isHierarchical: false,
    allowCycles: false,
    maxFromSource: null,
    visual: "alignment",
  },
  {
    key: "depends_on",
    nameAr: "يعتمد على",
    descriptionAr: "اعتماد تنفيذي بين المشاريع — منفصل عن الاحتواء.",
    allowedSources: ["project"],
    allowedTargets: ["project"],
    isDirectional: true,
    isHierarchical: false,
    allowCycles: false,
    maxFromSource: null,
    visual: "dependency",
  },
  {
    key: "related_to",
    nameAr: "مرتبط بـ",
    descriptionAr: "ارتباط عام بين كيانين دون احتواء أو اعتماد.",
    allowedSources: ["portfolio", "initiative", "program", "project"],
    allowedTargets: ["portfolio", "initiative", "program", "project"],
    isDirectional: false,
    isHierarchical: false,
    allowCycles: true,
    maxFromSource: null,
    visual: "association",
  },
];

/** Demo defaults documented here:
 * - Projects need not belong to a program or initiative.
 * - A project may align with multiple initiatives.
 * - A program may be contained by one portfolio (FK) and support multiple initiatives via contains/aligns.
 * - Non-adjacent contains (e.g. portfolio→project) is allowed as portfolio-standalone placement.
 * - depends_on never implies containment.
 */
export const CONTAINS_PAIRS: Array<{
  source: StrategicEntityType;
  target: StrategicEntityType;
}> = [
  { source: "portfolio", target: "initiative" },
  { source: "portfolio", target: "program" },
  { source: "portfolio", target: "project" },
  { source: "initiative", target: "program" },
  { source: "initiative", target: "project" },
  { source: "program", target: "project" },
];

export function getRelationshipDef(
  key: RelationshipTypeKey,
): RelationshipTypeDefinition {
  const def = RELATIONSHIP_TYPES.find((t) => t.key === key);
  if (!def) throw new Error(`Unknown relationship type: ${key}`);
  return def;
}

export function entityLabelAr(type: StrategicEntityType): string {
  switch (type) {
    case "portfolio":
      return "محفظة";
    case "initiative":
      return "مبادرة";
    case "program":
      return "برنامج";
    case "project":
      return "مشروع";
  }
}

export interface ValidateRelationshipInput {
  sourceType: StrategicEntityType;
  sourceId: string;
  targetType: StrategicEntityType;
  targetId: string;
  relationshipType: RelationshipTypeKey;
  effectiveFrom?: string;
  effectiveTo?: string;
  existing: EntityRelationship[];
  /** Exclude this id when editing */
  excludeId?: string;
}

export interface ValidateRelationshipResult {
  ok: boolean;
  errors: Partial<
    Record<
      "source" | "target" | "type" | "dates" | "general",
      string
    >
  >;
}

function wouldCreateHierarchyCycle(
  existing: EntityRelationship[],
  sourceId: string,
  targetId: string,
): boolean {
  // Walk from target via contains edges; if we reach source, adding source→target cycles.
  const children = new Map<string, string[]>();
  for (const r of existing) {
    if (!r.isActive || r.relationshipType !== "contains") continue;
    const list = children.get(r.sourceId) ?? [];
    list.push(r.targetId);
    children.set(r.sourceId, list);
  }
  const stack = [targetId];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === sourceId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of children.get(cur) ?? []) stack.push(next);
  }
  return false;
}

function wouldCreateDependencyCycle(
  existing: EntityRelationship[],
  sourceId: string,
  targetId: string,
): boolean {
  const deps = new Map<string, string[]>();
  for (const r of existing) {
    if (!r.isActive || r.relationshipType !== "depends_on") continue;
    const list = deps.get(r.sourceId) ?? [];
    list.push(r.targetId);
    deps.set(r.sourceId, list);
  }
  const stack = [targetId];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === sourceId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of deps.get(cur) ?? []) stack.push(next);
  }
  return false;
}

export function validateRelationship(
  input: ValidateRelationshipInput,
): ValidateRelationshipResult {
  const errors: ValidateRelationshipResult["errors"] = {};
  const def = getRelationshipDef(input.relationshipType);

  if (!input.sourceId) errors.source = "حدد الكيان المصدر.";
  if (!input.targetId) errors.target = "حدد الكيان الهدف.";

  if (
    input.sourceId &&
    input.targetId &&
    input.sourceId === input.targetId &&
    input.sourceType === input.targetType
  ) {
    errors.general = "لا يمكن ربط الكيان بنفسه.";
  }

  if (!def.allowedSources.includes(input.sourceType)) {
    errors.source = `نوع المصدر غير مسموح لعلاقة «${def.nameAr}».`;
  }
  if (!def.allowedTargets.includes(input.targetType)) {
    errors.target = `نوع الهدف غير مسموح لعلاقة «${def.nameAr}».`;
  }

  if (input.relationshipType === "contains") {
    const allowed = CONTAINS_PAIRS.some(
      (p) => p.source === input.sourceType && p.target === input.targetType,
    );
    if (!allowed) {
      errors.general = `الاحتواء غير مدعوم من ${entityLabelAr(input.sourceType)} إلى ${entityLabelAr(input.targetType)}.`;
    }
  }

  if (
    input.effectiveFrom &&
    input.effectiveTo &&
    input.effectiveFrom > input.effectiveTo
  ) {
    errors.dates = "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.";
  }

  const active = input.existing.filter(
    (r) => r.isActive && r.id !== input.excludeId,
  );

  const duplicate = active.some(
    (r) =>
      r.relationshipType === input.relationshipType &&
      r.sourceId === input.sourceId &&
      r.targetId === input.targetId &&
      r.sourceType === input.sourceType &&
      r.targetType === input.targetType,
  );
  if (duplicate) {
    errors.general = "هذه العلاقة موجودة مسبقاً.";
  }

  // Undirected related_to: treat reverse as duplicate
  if (input.relationshipType === "related_to" && !duplicate) {
    const rev = active.some(
      (r) =>
        r.relationshipType === "related_to" &&
        r.sourceId === input.targetId &&
        r.targetId === input.sourceId,
    );
    if (rev) errors.general = "هذه العلاقة موجودة مسبقاً (اتجاه معاكس).";
  }

  if (
    def.isHierarchical &&
    !def.allowCycles &&
    input.sourceId &&
    input.targetId &&
    wouldCreateHierarchyCycle(active, input.sourceId, input.targetId)
  ) {
    errors.general = "هذه العلاقة تُنشئ دورة في التسلسل الهرمي.";
  }

  if (
    input.relationshipType === "depends_on" &&
    input.sourceId &&
    input.targetId &&
    wouldCreateDependencyCycle(active, input.sourceId, input.targetId)
  ) {
    errors.general = "هذه الاعتمادية تُنشئ دورة بين المشاريع.";
  }

  if (def.maxFromSource != null) {
    const count = active.filter(
      (r) =>
        r.relationshipType === input.relationshipType &&
        r.sourceId === input.sourceId,
    ).length;
    if (count >= def.maxFromSource) {
      errors.general = `تجاوز الحد الأقصى لعلاقات «${def.nameAr}» من هذا المصدر.`;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
