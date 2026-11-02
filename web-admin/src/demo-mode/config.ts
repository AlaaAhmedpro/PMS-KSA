/** Demo Mode for Platform Admin — simulated auth/data only. */
export const DEMO_MODE = {
  enabled: (import.meta.env.VITE_DEMO_MODE ?? "true") !== "false",
  defaultPassword: "demo1234",
  mfaOtp: "123456",
  maxLoginAttempts: 5,
  rateLimitWindowMs: 15 * 60 * 1000,
  asyncDelayMs: 220,
} as const;

export function isDemoMode(): boolean {
  return DEMO_MODE.enabled;
}

export async function demoDelay(ms?: number): Promise<void> {
  if (!isDemoMode()) return;
  await new Promise((r) => setTimeout(r, ms ?? DEMO_MODE.asyncDelayMs));
}
