import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, LogIn, Mail, Shield } from "lucide-react";
import type { User } from "../lib/types";
import { useAuth } from "../store/AuthContext";
import { useLocale } from "../store/LocaleContext";
import { AuthShell } from "../components/auth/AuthShell";
import { Field, Input } from "../components/ui/Input";
import { DEMO_MODE } from "../demo-mode/config";

type QuickRoleItem = {
  labelKey: string;
  findUser: (users: User[]) => User | undefined;
};

const QUICK: QuickRoleItem[] = [
  {
    labelKey: "role.platformAdmin",
    findUser: (us) => us.find((u) => u.email === "platform@namaa.sa"),
  },
  {
    labelKey: "role.platformOps",
    findUser: (us) => us.find((u) => u.email === "ops@namaa.sa"),
  },
  {
    labelKey: "role.platformSales",
    findUser: (us) => us.find((u) => u.email === "sales@namaa.sa"),
  },
];

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
  const { login, loginAs, users } = useAuth();
  const { t, locale } = useLocale();
  const quickUsers = users.filter((u) => u.active !== false);
  const navigate = useNavigate();
  const [email, setEmail] = useState("platform@namaa.sa");
  const [password, setPassword] = useState<string>(DEMO_MODE.defaultPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputAlign = locale === "ar" ? "text-right" : "text-left";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) navigate("/");
    else setError(res.reason || t("login.errorAdmin"));
  };

  const quickLogin = (item: QuickRoleItem) => {
    const user = item.findUser(quickUsers);
    if (user) {
      loginAs(user);
      navigate("/");
      return;
    }
    setError(t("login.errorNoDemoUser"));
  };

  return (
    <AuthShell>
      <form
        onSubmit={submit}
        className="login-card login-card--premium login-card--scroll login-card--login"
      >
        <header className="auth-card__head auth-card__head--plain">
          <span className="auth-card__head-badge" aria-hidden>
            <LogIn className="h-5 w-5" />
          </span>
          <h2 className="auth-card__heading">{t("login.title")}</h2>
          <p className="auth-card__sub">{t("login.sub")}</p>
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
                placeholder="platform@namaa.sa"
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

          {error && (
            <motion.p
              className="auth-form__error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
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
          <div className="auth-quick-row">
            {QUICK.map((item, i) => (
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
        </div>

        <footer className="auth-card__footer">
          <p className="auth-trust">
            <Shield className="h-3 w-3" aria-hidden />
            {t("login.demoTrust", { password: DEMO_MODE.defaultPassword })}
          </p>
        </footer>
      </form>
    </AuthShell>
  );
}
