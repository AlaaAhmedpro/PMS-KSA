import type {
  Initiative,
  Portfolio,
  Program,
  Project,
} from "../models/domain";
import { getProjectPlacement } from "./orgModules";

export function projectsForPortfolio(
  projects: Project[],
  portfolioId: string,
): Project[] {
  return projects.filter((p) => p.portfolioId === portfolioId);
}

export function programsForPortfolio(
  programs: Program[],
  portfolioId: string,
): Program[] {
  return programs.filter((p) => p.portfolioId === portfolioId);
}

/** Initiatives that belong directly to a portfolio. */
export function initiativesForPortfolio(
  initiatives: Initiative[],
  portfolioId: string,
): Initiative[] {
  return initiatives.filter((ini) => ini.portfolioId === portfolioId);
}

export function projectsForProgram(
  projects: Project[],
  programId: string,
): Project[] {
  return projects.filter((p) => p.programId === programId);
}

export function programsForInitiative(
  programs: Program[],
  initiativeId: string,
): Program[] {
  return programs.filter((prg) => prg.initiativeId === initiativeId);
}

export function projectsForInitiative(
  projects: Project[],
  programs: Program[],
  initiative: Initiative,
): Project[] {
  const ids = new Set<string>(initiative.standaloneProjectIds);
  for (const prg of programsForInitiative(programs, initiative.id)) {
    for (const p of projects) {
      if (p.programId === prg.id) ids.add(p.id);
    }
  }
  return projects.filter((p) => ids.has(p.id));
}

export function isStandaloneInitiative(initiative: Initiative): boolean {
  return !initiative.portfolioId;
}

/** Program not linked from any initiative. */
export function isStandaloneProgram(program: Program): boolean {
  return !program.initiativeId;
}

export function initiativesForProject(
  initiatives: Initiative[],
  programs: Program[],
  project: Project,
): Initiative[] {
  return initiatives.filter((ini) => {
    if (ini.standaloneProjectIds.includes(project.id)) return true;
    if (!project.programId) return false;
    return programs.some(
      (prg) => prg.id === project.programId && prg.initiativeId === ini.id,
    );
  });
}

export function projectRelationships(
  project: Project,
  portfolios: Portfolio[],
  programs: Program[],
  initiatives: Initiative[],
) {
  const portfolio = project.portfolioId
    ? portfolios.find((p) => p.id === project.portfolioId)
    : undefined;
  const program = project.programId
    ? programs.find((p) => p.id === project.programId)
    : undefined;
  const linkedInitiatives = initiativesForProject(
    initiatives,
    programs,
    project,
  );
  const placement = getProjectPlacement(project);
  return { portfolio, program, linkedInitiatives, placement };
}
