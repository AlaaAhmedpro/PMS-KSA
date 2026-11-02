import type {
  EntityRelationship,
  Initiative,
  Portfolio,
  Program,
  Project,
  StrategicEntityType,
} from "../models/domain";
import { getProjectPlacement } from "./orgModules";
import { entityLabelAr } from "./relationshipRules";

export interface StrategicEntityRef {
  type: StrategicEntityType;
  id: string;
  name: string;
  description: string;
  status?: string;
  ownerId?: string;
  departmentId?: string;
  createdAt?: string;
}

export function collectStrategicEntities(input: {
  portfolios: Portfolio[];
  initiatives: Initiative[];
  programs: Program[];
  projects: Project[];
}): StrategicEntityRef[] {
  return [
    ...input.portfolios.map((p) => ({
      type: "portfolio" as const,
      id: p.id,
      name: p.name,
      description: p.description,
      ownerId: p.ownerUserId,
    })),
    ...input.initiatives.map((i) => ({
      type: "initiative" as const,
      id: i.id,
      name: i.name,
      description: i.description,
    })),
    ...input.programs.map((p) => ({
      type: "program" as const,
      id: p.id,
      name: p.name,
      description: p.description,
      ownerId: p.managerUserId,
    })),
    ...input.projects.map((p) => ({
      type: "project" as const,
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      ownerId: p.managerUserId,
      departmentId: p.departmentId,
      createdAt: p.createdAt,
    })),
  ];
}

export function findEntityName(
  entities: StrategicEntityRef[],
  type: StrategicEntityType,
  id: string,
): string {
  return entities.find((e) => e.type === type && e.id === id)?.name ?? id;
}

export function formatEntityTitle(
  type: StrategicEntityType,
  name: string,
): string {
  return `${entityLabelAr(type)}: ${name}`;
}

export function activeRelationships(
  relationships: EntityRelationship[],
): EntityRelationship[] {
  return relationships.filter((r) => r.isActive);
}

export function relationshipsForEntity(
  relationships: EntityRelationship[],
  type: StrategicEntityType,
  id: string,
): { incoming: EntityRelationship[]; outgoing: EntityRelationship[] } {
  const active = activeRelationships(relationships);
  return {
    incoming: active.filter((r) => r.targetType === type && r.targetId === id),
    outgoing: active.filter((r) => r.sourceType === type && r.sourceId === id),
  };
}

export function relatedCount(
  relationships: EntityRelationship[],
  type: StrategicEntityType,
  id: string,
): number {
  const { incoming, outgoing } = relationshipsForEntity(relationships, type, id);
  return incoming.length + outgoing.length;
}

/** Primary organizational placement from contains edges / FKs — never invent. */
export function primaryPlacement(
  entity: StrategicEntityRef,
  relationships: EntityRelationship[],
  projects: Project[],
  programs: Program[],
): { label: string; parentType?: StrategicEntityType; parentId?: string } | null {
  const active = activeRelationships(relationships);
  if (entity.type === "project") {
    const project = projects.find((p) => p.id === entity.id);
    const containedByProgram = active.find(
      (r) =>
        r.relationshipType === "contains" &&
        r.targetType === "project" &&
        r.targetId === entity.id &&
        r.sourceType === "program",
    );
    if (containedByProgram) {
      return {
        label: "تحت برنامج",
        parentType: "program",
        parentId: containedByProgram.sourceId,
      };
    }
    const containedByPortfolio = active.find(
      (r) =>
        r.relationshipType === "contains" &&
        r.targetType === "project" &&
        r.targetId === entity.id &&
        r.sourceType === "portfolio",
    );
    if (containedByPortfolio) {
      return {
        label: "مستقل تحت محفظة",
        parentType: "portfolio",
        parentId: containedByPortfolio.sourceId,
      };
    }
    if (project) {
      const place = getProjectPlacement(project);
      if (place === "under_program" && project.programId) {
        return {
          label: "تحت برنامج",
          parentType: "program",
          parentId: project.programId,
        };
      }
      if (place === "portfolio_standalone" && project.portfolioId) {
        return {
          label: "مستقل تحت محفظة",
          parentType: "portfolio",
          parentId: project.portfolioId,
        };
      }
      return { label: "مستقل تماماً" };
    }
  }
  if (entity.type === "program") {
    const program = programs.find((p) => p.id === entity.id);
    const byPortfolio = active.find(
      (r) =>
        r.relationshipType === "contains" &&
        r.sourceType === "portfolio" &&
        r.targetType === "program" &&
        r.targetId === entity.id,
    );
    if (byPortfolio) {
      return {
        label: "تحت محفظة",
        parentType: "portfolio",
        parentId: byPortfolio.sourceId,
      };
    }
    if (program?.portfolioId) {
      return {
        label: "تحت محفظة",
        parentType: "portfolio",
        parentId: program.portfolioId,
      };
    }
  }
  if (entity.type === "initiative") {
    const byPortfolio = active.find(
      (r) =>
        r.relationshipType === "contains" &&
        r.sourceType === "portfolio" &&
        r.targetType === "initiative" &&
        r.targetId === entity.id,
    );
    if (byPortfolio) {
      return {
        label: "تحت محفظة",
        parentType: "portfolio",
        parentId: byPortfolio.sourceId,
      };
    }
    return { label: "مبادرة بلا احتواء محفظة" };
  }
  return null;
}

export function isIndependentProject(
  project: Project,
  relationships: EntityRelationship[],
): boolean {
  const active = activeRelationships(relationships);
  const hasContains = active.some(
    (r) =>
      r.relationshipType === "contains" &&
      r.targetType === "project" &&
      r.targetId === project.id,
  );
  if (hasContains) return false;
  if (project.programId || project.portfolioId) return false;
  return true;
}

export function projectsWithoutStrategicAlignment(
  projects: Project[],
  relationships: EntityRelationship[],
): Project[] {
  const active = activeRelationships(relationships);
  return projects.filter((p) => {
    if (isIndependentProject(p, relationships)) return true;
    const hasAlign = active.some(
      (r) =>
        r.relationshipType === "aligns_with" &&
        ((r.sourceType === "project" && r.sourceId === p.id) ||
          (r.targetType === "project" && r.targetId === p.id)),
    );
    const hasContains = active.some(
      (r) =>
        r.relationshipType === "contains" &&
        r.targetType === "project" &&
        r.targetId === p.id,
    );
    return !hasAlign && !hasContains && !p.programId && !p.portfolioId;
  });
}

export function detailPath(type: StrategicEntityType, id: string): string {
  switch (type) {
    case "portfolio":
      return "/portfolios";
    case "initiative":
      return "/initiatives";
    case "program":
      return "/programs";
    case "project":
      return `/projects/${id}`;
  }
}
