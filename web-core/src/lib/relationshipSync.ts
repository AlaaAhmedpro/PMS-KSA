import type {
  EntityRelationship,
  Initiative,
  Program,
  Project,
} from "../models/domain";

/** Apply FK side-effects for hierarchical/alignment edges without recreating entities. */
export function applyRelationshipSideEffects(
  rel: EntityRelationship,
  ctx: {
    projects: Project[];
    programs: Program[];
    initiatives: Initiative[];
  },
): {
  projects?: Project[];
  programs?: Program[];
  initiatives?: Initiative[];
} {
  if (!rel.isActive) return {};

  if (rel.relationshipType === "contains") {
    if (rel.sourceType === "program" && rel.targetType === "project") {
      const program = ctx.programs.find((p) => p.id === rel.sourceId);
      return {
        projects: ctx.projects.map((p) =>
          p.id === rel.targetId
            ? {
                ...p,
                programId: rel.sourceId,
                portfolioId: program?.portfolioId ?? p.portfolioId,
                standalone: false,
              }
            : p,
        ),
      };
    }
    if (rel.sourceType === "portfolio" && rel.targetType === "project") {
      return {
        projects: ctx.projects.map((p) =>
          p.id === rel.targetId
            ? {
                ...p,
                portfolioId: rel.sourceId,
                programId: undefined,
                standalone: true,
              }
            : p,
        ),
      };
    }
    if (rel.sourceType === "portfolio" && rel.targetType === "initiative") {
      return {
        initiatives: ctx.initiatives.map((i) =>
          i.id === rel.targetId ? { ...i, portfolioId: rel.sourceId } : i,
        ),
      };
    }
    if (rel.sourceType === "initiative" && rel.targetType === "program") {
      const initiative = ctx.initiatives.find((i) => i.id === rel.sourceId);
      return {
        programs: ctx.programs.map((p) =>
          p.id === rel.targetId
            ? {
                ...p,
                initiativeId: rel.sourceId,
                portfolioId: initiative?.portfolioId ?? p.portfolioId,
              }
            : p,
        ),
      };
    }
    if (rel.sourceType === "initiative" && rel.targetType === "project") {
      return {
        initiatives: ctx.initiatives.map((i) =>
          i.id === rel.sourceId && !i.standaloneProjectIds.includes(rel.targetId)
            ? {
                ...i,
                standaloneProjectIds: [...i.standaloneProjectIds, rel.targetId],
              }
            : i,
        ),
      };
    }
  }

  if (rel.relationshipType === "aligns_with") {
    if (rel.sourceType === "project" && rel.targetType === "initiative") {
      return {
        initiatives: ctx.initiatives.map((i) =>
          i.id === rel.targetId && !i.standaloneProjectIds.includes(rel.sourceId)
            ? {
                ...i,
                standaloneProjectIds: [...i.standaloneProjectIds, rel.sourceId],
              }
            : i,
        ),
      };
    }
    if (rel.sourceType === "initiative" && rel.targetType === "project") {
      return {
        initiatives: ctx.initiatives.map((i) =>
          i.id === rel.sourceId && !i.standaloneProjectIds.includes(rel.targetId)
            ? {
                ...i,
                standaloneProjectIds: [...i.standaloneProjectIds, rel.targetId],
              }
            : i,
        ),
      };
    }
    if (rel.sourceType === "project" && rel.targetType === "portfolio") {
      return {
        projects: ctx.projects.map((p) =>
          p.id === rel.sourceId
            ? { ...p, portfolioId: p.portfolioId ?? rel.targetId }
            : p,
        ),
      };
    }
  }

  return {};
}

/** Soft-clear FKs when removing contains — never delete the entity. */
export function clearRelationshipSideEffects(
  rel: EntityRelationship,
  ctx: {
    projects: Project[];
    programs: Program[];
    initiatives: Initiative[];
  },
): {
  projects?: Project[];
  programs?: Program[];
  initiatives?: Initiative[];
} {
  if (rel.relationshipType === "contains") {
    if (rel.sourceType === "program" && rel.targetType === "project") {
      return {
        projects: ctx.projects.map((p) =>
          p.id === rel.targetId && p.programId === rel.sourceId
            ? { ...p, programId: undefined, standalone: true }
            : p,
        ),
      };
    }
    if (rel.sourceType === "portfolio" && rel.targetType === "project") {
      return {
        projects: ctx.projects.map((p) =>
          p.id === rel.targetId && p.portfolioId === rel.sourceId && !p.programId
            ? { ...p, portfolioId: undefined }
            : p,
        ),
      };
    }
    if (rel.sourceType === "portfolio" && rel.targetType === "initiative") {
      return {
        initiatives: ctx.initiatives.map((i) =>
          i.id === rel.targetId && i.portfolioId === rel.sourceId
            ? { ...i, portfolioId: undefined }
            : i,
        ),
      };
    }
    if (rel.sourceType === "initiative" && rel.targetType === "program") {
      return {
        programs: ctx.programs.map((p) =>
          p.id === rel.targetId && p.initiativeId === rel.sourceId
            ? { ...p, initiativeId: undefined }
            : p,
        ),
      };
    }
    if (rel.sourceType === "initiative" && rel.targetType === "project") {
      return {
        initiatives: ctx.initiatives.map((i) =>
          i.id === rel.sourceId
            ? {
                ...i,
                standaloneProjectIds: i.standaloneProjectIds.filter(
                  (id) => id !== rel.targetId,
                ),
              }
            : i,
        ),
      };
    }
  }

  if (rel.relationshipType === "aligns_with") {
    if (rel.sourceType === "project" && rel.targetType === "initiative") {
      return {
        initiatives: ctx.initiatives.map((i) =>
          i.id === rel.targetId
            ? {
                ...i,
                standaloneProjectIds: i.standaloneProjectIds.filter(
                  (id) => id !== rel.sourceId,
                ),
              }
            : i,
        ),
      };
    }
    if (rel.sourceType === "initiative" && rel.targetType === "project") {
      return {
        initiatives: ctx.initiatives.map((i) =>
          i.id === rel.sourceId
            ? {
                ...i,
                standaloneProjectIds: i.standaloneProjectIds.filter(
                  (id) => id !== rel.targetId,
                ),
              }
            : i,
        ),
      };
    }
  }

  return {};
}
