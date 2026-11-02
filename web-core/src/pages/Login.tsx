import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Shield,
} from "lucide-react";
import type { User } from "../lib/types";
import type { DemoUser } from "../models/domain";
import { useAuth } from "../store/AuthContext";
import { useLocale } from "../store/LocaleContext";
import { AuthShell } from "../components/auth/AuthShell";
import { Field, Input } from "../components/ui/Input";
import { DEMO_MODE } from "../demo-mode/config";

type AuthStep = "login" | "mfa" | "forgot";

type QuickRoleItem = {
  labelKey: string;
  findUser: (users: User[]) => User | undefined;
};

const QUICK_ROW_1: QuickRoleItem[] = [
  { labelKey: "role.orgAdmin", findUser: (us) => us.find((u) => u.role === "org_admin") },
  { labelKey: "role.projectManager", findUser: (us) => us.find((u) => u.role === "project_manager") },
  { labelKey: "role.member", findUser: (us) => us.find((u) => u.role === "member") },
  { labelKey: "role.external", findUser: (us) => us.find((u) => u.role === "external") },
];

const QUICK_ROW_2: QuickRoleItem[] = [
  { labelKey: "role.executive", findUser: (us) => us.find((u) => u.role === "executive") },
  { labelKey: "role.pr", findUser: (us) => us.find((u) => u.role === "pr") },
];

const RETURN_KEY = "pms_core_return_path";

function QuickRoleTile({
  item,
  index,
  onSelect,
  users,
  label,
}: {
  item: QuickRoleItem;
  index: number;
  onSelect: (item: QuickRoleItem) => void;
  users: User[];
  label: string;
}) {
  const user = item.findUser(users);
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.04 }}
      onClick={() => onSelect(item)}
      className="auth-quick-btn auth-quick-btn--tile"
    >
      <span className="auth-quick-btn__body">
        <span className="auth-quick-btn__role">{label}</span>
        <span className="auth-quick-btn__name">{user?.name ?? "—"}</span>
      </span>
    </motion.button>
  );
}

export function Login() {
  const { login, completeMfa, loginAs, users, resetPassword } = useAuth();
  const { t, locale } = useLocale();
  const quickUsers = users.filter((u) => u.active !== false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputAlign = locale === "ar" ? "text-right" : "text-left";

  const returnTo = useMemo(() => {
    const fromState = (location.state as { from?: { pathname?: string } } | null)
      ?.from?.pathname;
    if (fromState && fromState !== "/login") return fromState;
    try {
      const stored = sessionStorage.getItem(RETURN_KEY);
      if (stored && stored !== "/login") return stored;
    } catch {
      /* ignore */
    }
    return "/";
  }, [location.state]);

  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("admin@namaa.sa");
  const [password, setPassword] = useState<string>(DEMO_MODE.defaultPassword);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [mfaPending, setMfaPending] = useState<DemoUser | null>(null);

  const goAfterAuth = () => {
    try {
      sessionStorage.removeItem(RETURN_KEY);
    } catch {
      /* ignore */
    }
    navigate(returnTo || "/", { replace: true });
  };

  const backToLogin = () => {
    setStep("login");
    setMfaPending(null);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setInfo("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.reason || t("login.errorGeneric"));
      return;
    }
    if (res.needsMfa && res.pendingUser) {
      setMfaPending(res.pendingUser);
      setStep("mfa");
      setOtp("");
      return;
    }
    goAfterAuth();
  };

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaPending) return;
    setBusy(true);
    setError("");
    const res = await completeMfa(otp, mfaPending);
    setBusy(false);
    if (!res.ok) {
      setError(res.reason || t("mfa.error"));
      return;
    }
    goAfterAuth();
  };

  const submitForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (newPassword !== confirmPassword) {
      setError(t("forgot.mismatch"));
      return;
    }
    const res = resetPassword(email, newPassword);
    if (!res.ok) {
      setError(res.reason || t("forgot.error"));
      return;
    }
    setPassword(newPassword);
    setInfo(t("forgot.success"));
    setStep("login");
    setNewPassword("");
    setConfirmPassword("");
  };

  const quickLogin = (item: QuickRoleItem) => {
    const user = item.findUser(quickUsers);
    if (user) {
      loginAs(user);
      goAfterAuth();
      return;
    }
    setError(t("login.errorNoDemoUser"));
  };

  return (
    <AuthShell>
      {step === "mfa" && mfaPending ? (
        <form
          key="mfa"
          onSubmit={submitMfa}
          className="login-card login-card--premium login-card--scroll login-card--login"
        >
          <header className="auth-card__head auth-card__head--plain">
            <span className="auth-card__head-badge" aria-hidden>
              <KeyRound className="h-5 w-5" />
            </span>
            <h2 className="auth-card__heading">{t("mfa.title")}</h2>
            <p className="auth-card__sub">
              {t("mfa.sub", { n: DEMO_MODE.mfaOtpLength })}
            </p>
          </header>
          <div className="auth-card__section auth-card__section--fields">
            <Field label={t("mfa.code")} required>
              <div className="auth-field">
                <KeyRound className="auth-field__icon" aria-hidden />
                <Input
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, DEMO_MODE.mfaOtpLength))
                  }
                  placeholder="••••"
                  inputMode="numeric"
                  maxLength={DEMO_MODE.mfaOtpLength}
                  dir="ltr"
                  className={`auth-field__input ${inputAlign}`}
                  autoFocus
                />
              </div>
            </Field>
            {error && <p className="auth-form__error">{error}</p>}
            <button type="submit" className="auth-submit" disabled={busy}>
              {t("mfa.submit")}
            </button>
            <button type="button" className="auth-forgot" onClick={backToLogin}>
              <ArrowRight className="h-4 w-4" />
              {t("mfa.back")}
            </button>
          </div>
          <footer className="auth-card__footer">
            <p className="auth-trust">
              <Shield className="h-3 w-3" aria-hidden />
              {t("mfa.trust", { company: t("brand.company") })}
            </p>
          </footer>
        </form>
      ) : step === "forgot" ? (
        <form
          key="forgot"
          onSubmit={submitForgot}
          className="login-card login-card--premium login-card--scroll login-card--login"
        >
          <header className="auth-card__head auth-card__head--plain">
            <span className="auth-card__head-badge" aria-hidden>
              <Lock className="h-5 w-5" />
            </span>
            <h2 className="auth-card__heading">{t("forgot.title")}</h2>
            <p className="auth-card__sub">{t("forgot.sub")}</p>
          </header>
          <div className="auth-card__section auth-card__section--fields">
            <Field label={t("login.email")} required>
              <div className="auth-field">
                <Mail className="auth-field__icon" aria-hidden />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className={`auth-field__input ${inputAlign}`}
                />
              </div>
            </Field>
            <Field label={t("forgot.newPassword")} required>
              <div className="auth-field">
                <Lock className="auth-field__icon" aria-hidden />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`auth-field__input ${inputAlign}`}
                />
              </div>
            </Field>
            <Field label={t("forgot.confirmPassword")} required>
              <div className="auth-field">
                <Lock className="auth-field__icon" aria-hidden />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`auth-field__input ${inputAlign}`}
                />
              </div>
            </Field>
            {error && <p className="auth-form__error">{error}</p>}
            <button type="submit" className="auth-submit">
              {t("forgot.submit")}
            </button>
            <button type="button" className="auth-forgot" onClick={backToLogin}>
              <ArrowRight className="h-4 w-4" />
              {t("forgot.back")}
            </button>
          </div>
        </form>
      ) : (
        <form
          key="login"
          onSubmit={submit}
          className="login-card login-card--premium login-card--scroll login-card--login"
        >
          <header className="auth-card__head auth-card__head--plain">
            <span className="auth-card__head-badge" aria-hidden>
              <LogIn className="h-5 w-5" />
            </span>
            <h2 className="auth-card__heading">{t("login.title")}</h2>
            <p className="auth-card__sub">{t("brand.systemSubtitle")}</p>
          </header>

          <div className="auth-card__section auth-card__section--fields">
            <Field label={t("login.email")} required>
              <div className="auth-field">
                <Mail className="auth-field__icon" aria-hidden />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="name@company.sa"
                  dir="ltr"
                  className={`auth-field__input ${inputAlign}`}
                />
              </div>
            </Field>

            <Field label={t("login.password")} required>
              <div className="auth-field">
                <Lock className="auth-field__icon" aria-hidden />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  className={`auth-field__input auth-field__input--password ${inputAlign}`}
                />
                <button
                  type="button"
                  className="auth-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <div className="auth-forgot-row">
              <button
                type="button"
                className="auth-forgot"
                onClick={() => {
                  setStep("forgot");
                  setError("");
                  setInfo("");
                }}
              >
                {t("login.forgot")}
              </button>
            </div>

            {info && (
              <motion.p className="auth-form__info" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {info}
              </motion.p>
            )}
            {error && (
              <motion.p className="auth-form__error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error}
              </motion.p>
            )}

            <button type="submit" className="auth-submit" disabled={busy}>
              <LogIn className="h-5 w-5" />
              {busy ? t("login.submitting") : t("login.submit")}
            </button>
          </div>

          <div className="auth-card__section auth-card__section--quick">
            <div className="auth-divider">
              <span className="auth-divider__line" />
              <span className="auth-divider__text">{t("login.quickTitle")}</span>
              <span className="auth-divider__line" />
            </div>
            <div className="auth-quick-rows">
              <div className="auth-quick-row">
                {QUICK_ROW_1.map((item, i) => (
                  <QuickRoleTile
                    key={item.labelKey}
                    item={item}
                    index={i}
                    users={quickUsers}
                    onSelect={quickLogin}
                    label={t(item.labelKey)}
                  />
                ))}
              </div>
              <div className="auth-quick-row auth-quick-row--second">
                {QUICK_ROW_2.map((item, i) => (
                  <QuickRoleTile
                    key={item.labelKey}
                    item={item}
                    index={QUICK_ROW_1.length + i}
                    users={quickUsers}
                    onSelect={quickLogin}
                    label={t(item.labelKey)}
                  />
                ))}
              </div>
            </div>
          </div>

          <footer className="auth-card__footer">
            <p className="auth-trust">
              <Shield className="h-3 w-3" aria-hidden />
              {t("brand.company")} — {t("brand.tagline")}
            </p>
            <p className="auth-footer-link">
              <span className="auth-footer-muted">{t("login.newOrg")}</span>{" "}
              <Link to="/register" className="auth-link">
                {t("login.register")}
              </Link>
            </p>
          </footer>
        </form>
      )}
    </AuthShell>
  );
}
