/**
 * Demo Mode configuration — simulated backend only.
 * Not production security. Swap services for HTTP later via this flag.
 */
export const DEMO_MODE = {
  enabled: (import.meta.env.VITE_DEMO_MODE ?? "true") !== "false",
  /** Default password for all seeded demo users */
  defaultPassword: "demo1234",
  /** Legacy sample OTP (any 4 digits are accepted in Demo) */
  mfaOtp: "1234",
  /** MFA: accept any numeric code of this length */
  mfaOtpLength: 4,
  /** Failed login attempts before rate-limit message */
  maxLoginAttempts: 5,
  /** Window for attempt counting (ms) */
  rateLimitWindowMs: 15 * 60 * 1000,
  /** Simulated network delay (ms) */
  asyncDelayMs: 280,
} as const;

export function isDemoMode(): boolean {
  return DEMO_MODE.enabled;
}

export async function demoDelay(ms?: number): Promise<void> {
  if (!isDemoMode()) return;
  await new Promise((r) => setTimeout(r, ms ?? DEMO_MODE.asyncDelayMs));
}
