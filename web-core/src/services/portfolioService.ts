import type { Portfolio, Program } from "../models/domain";
import { demoDelay } from "../demo-mode/config";

export class PortfolioServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortfolioServiceError";
  }
}

export function validatePortfolioName(name: string): void {
  if (!name.trim()) throw new PortfolioServiceError("اسم المحفظة مطلوب.");
}

export function canDeletePortfolio(
  portfolioId: string,
  programs: Program[],
  projectPortfolioIds: string[],
): { ok: boolean; reason?: string } {
  if (programs.some((p) => p.portfolioId === portfolioId)) {
    return { ok: false, reason: "لا يمكن حذف محفظة مرتبطة ببرامج." };
  }
  if (projectPortfolioIds.includes(portfolioId)) {
    return { ok: false, reason: "لا يمكن حذف محفظة مرتبطة بمشاريع." };
  }
  return { ok: true };
}

export async function savePortfolioSimulated(_row?: Portfolio): Promise<void> {
  await demoDelay(120);
}
