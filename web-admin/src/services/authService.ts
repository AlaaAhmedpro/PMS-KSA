import { DEMO_MODE, demoDelay } from "../demo-mode/config";
import { ADMIN_LS } from "../demo-mode/keys";
import { loadJson, saveJson, removeKey } from "../demo-mode/storage";
import type { User } from "../lib/types";

export type AdminAuthErrorCode =
  | "validation"
  | "invalid_credentials"
  | "inactive"
  | "rate_limited";

export class AuthServiceError extends Error {
  code: AdminAuthErrorCode;
  constructor(code: AdminAuthErrorCode, message: string) {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
  }
}

export interface AdminSession {
  token: string;
  userId: string;
  createdAt: string;
}

interface AttemptState {
  count: number;
  windowStart: number;
}

function readAttempts(): AttemptState {
  return loadJson(ADMIN_LS.loginAttempts, { count: 0, windowStart: Date.now() });
}

function writeAttempts(state: AttemptState) {
  saveJson(ADMIN_LS.loginAttempts, state);
}

function bumpFailedAttempt() {
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
      "تم تجاوز عدد محاولات الدخول. حاول لاحقاً (محاكاة Demo).",
    );
  }
}

export async function authenticateAdmin(
  users: (User & { password?: string })[],
  email: string,
  password: string,
): Promise<User & { password?: string }> {
  await demoDelay();
  if (!email.trim() || !password.trim()) {
    throw new AuthServiceError("validation", "أدخل البريد وكلمة المرور.");
  }
  assertNotRateLimited();
  const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!found || (found.password ?? DEMO_MODE.defaultPassword) !== password) {
    bumpFailedAttempt();
    throw new AuthServiceError(
      "invalid_credentials",
      "تعذّر تسجيل الدخول. تحقق من البيانات.",
    );
  }
  if (found.active === false) {
    throw new AuthServiceError("inactive", "هذا الحساب معطّل.");
  }
  clearAttempts();
  return found;
}

export function createAdminSession(user: User): AdminSession {
  const session: AdminSession = {
    token: `admin-demo-${user.id}-${Date.now()}`,
    userId: user.id,
    createdAt: new Date().toISOString(),
  };
  saveJson(ADMIN_LS.session, session);
  return session;
}

export function clearAdminSession(): void {
  removeKey(ADMIN_LS.session);
}

export function readAdminSession(): AdminSession | null {
  return loadJson<AdminSession | null>(ADMIN_LS.session, null);
}
