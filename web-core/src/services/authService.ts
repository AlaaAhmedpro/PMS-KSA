import { DEMO_MODE, demoDelay } from "../demo-mode/config";
import { LS } from "../demo-mode/keys";
import { loadJson, saveJson } from "../demo-mode/storage";
import type { DemoSession, DemoUser } from "../models/domain";
import type { PermissionKey } from "../lib/types";
import { DEFAULT_MATRIX } from "../lib/constants";

export type AuthErrorCode =
  | "validation"
  | "invalid_credentials"
  | "inactive"
  | "rate_limited"
  | "mfa_required"
  | "mfa_invalid";

export class AuthServiceError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
  }
}

interface AttemptState {
  count: number;
  windowStart: number;
}

function permissionsFor(user: DemoUser): PermissionKey[] {
  const matrix = loadJson<Record<string, PermissionKey[]>>(LS.matrix, DEFAULT_MATRIX as Record<string, PermissionKey[]>);
  return matrix[user.role] ?? ["dashboard"];
}

function readAttempts(): AttemptState {
  return loadJson<AttemptState>(LS.loginAttempts, { count: 0, windowStart: Date.now() });
}

function writeAttempts(state: AttemptState) {
  saveJson(LS.loginAttempts, state);
}

function bumpFailedAttempt(): AttemptState {
  const now = Date.now();
  let state = readAttempts();
  if (now - state.windowStart > DEMO_MODE.rateLimitWindowMs) {
    state = { count: 0, windowStart: now };
  }
  state = { ...state, count: state.count + 1 };
  writeAttempts(state);
  return state;
}

function clearAttempts() {
  writeAttempts({ count: 0, windowStart: Date.now() });
}

function assertNotRateLimited() {
  const state = readAttempts();
  const now = Date.now();
  if (
    now - state.windowStart <= DEMO_MODE.rateLimitWindowMs &&
    state.count >= DEMO_MODE.maxLoginAttempts
  ) {
    throw new AuthServiceError(
      "rate_limited",
      "تم تجاوز عدد محاولات الدخول المسموح بها. حاول لاحقاً (محاكاة Demo).",
    );
  }
}

export function validateLoginFields(email: string, password: string): void {
  if (!email.trim() || !password.trim()) {
    throw new AuthServiceError("validation", "أدخل البريد الإلكتروني وكلمة المرور.");
  }
  if (!email.includes("@")) {
    throw new AuthServiceError("validation", "صيغة البريد الإلكتروني غير صحيحة.");
  }
}

export async function authenticateCredentials(
  users: DemoUser[],
  email: string,
  password: string,
): Promise<{ user: DemoUser; needsMfa: boolean }> {
  await demoDelay();
  validateLoginFields(email, password);
  assertNotRateLimited();

  const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!found || found.password !== password) {
    bumpFailedAttempt();
    throw new AuthServiceError(
      "invalid_credentials",
      "تعذّر تسجيل الدخول. تحقق من البيانات أو استخدم الدخول السريع.",
    );
  }
  if (found.active === false) {
    throw new AuthServiceError(
      "inactive",
      "هذا الحساب معطّل. تواصل مع مسؤول المؤسسة.",
    );
  }
  if (found.emailVerified === false) {
    throw new AuthServiceError(
      "inactive",
      "الحساب بانتظار تفعيل البريد. افتح رابط التفعيل المرسل إليك.",
    );
  }
  clearAttempts();
  if (found.mfaRequired && !found.mustChangePassword) {
    return { user: found, needsMfa: true };
  }
  return { user: found, needsMfa: false };
}

export async function verifyMfaOtp(otp: string): Promise<void> {
  await demoDelay(150);
  const cleaned = otp.trim();
  const ok = new RegExp(`^\\d{${DEMO_MODE.mfaOtpLength}}$`).test(cleaned);
  if (!ok) {
    throw new AuthServiceError(
      "mfa_invalid",
      `أدخل رمز تحقق مكوّناً من ${DEMO_MODE.mfaOtpLength} أرقام.`,
    );
  }
}

export function createSession(user: DemoUser): DemoSession {
  const session: DemoSession = {
    token: `demo-${user.id}-${Date.now()}`,
    userId: user.id,
    organizationId: user.organizationId,
    permissions: permissionsFor(user),
    createdAt: new Date().toISOString(),
  };
  saveJson(LS.session, session);
  return session;
}

export function clearSession(): void {
  try {
    localStorage.removeItem(LS.session);
  } catch {
    /* ignore */
  }
}

export function readSession(): DemoSession | null {
  return loadJson<DemoSession | null>(LS.session, null);
}
