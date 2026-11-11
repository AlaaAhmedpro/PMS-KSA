import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Lock, Mail, User, UserPlus } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { useLocale } from "../store/LocaleContext";
import { AuthShell } from "../components/auth/AuthShell";
import { Field, Input } from "../components/ui/Input";
import { DEMO_MODE } from "../demo-mode/config";

export function Register() {
  const { t, L } = useLocale();
  const { registerOrganization } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [sector, setSector] = useState(() => t("register.defaultSector"));
  const [city, setCity] = useState(() => t("city.riyadh"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState<string>(DEMO_MODE.defaultPassword);
  const [emailConfirmed, setEmailConfirmed] = useState(true);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!orgName.trim() || !name.trim() || !email.trim() || !password.trim()) {
      setError(t("register.error.incomplete"));
      return;
    }
    if (!emailConfirmed) {
      setError(t("register.error.emailConfirm"));
      return;
    }
    const res = registerOrganization({
      orgName: orgName.trim(),
      sector: sector.trim() || t("register.defaultSector"),
      city: city.trim() || t("city.riyadh"),
      adminName: name.trim(),
      adminEmail: email.trim(),
      password,
    });
    if (!res.ok) {
      setError(L(res.reason) || t("register.error.create"));
      return;
    }
    navigate("/");
  };

  return (
    <AuthShell wide>
      <form
        onSubmit={submit}
        className="login-card login-card--premium login-card--register login-card--scroll"
      >
        <header className="auth-card__head">
          <span className="auth-card__icon-badge">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="auth-card__titles">
            <h2 className="auth-card__heading">{t("register.title")}</h2>
            <p className="auth-card__sub">{t("register.subtitle")}</p>
          </div>
        </header>

        <div className="auth-card__section auth-card__section--fields auth-card__section--scroll">
          <Field label={t("register.orgName")} required>
            <div className="auth-field">
              <Building2 className="auth-field__icon" aria-hidden />
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={t("register.orgNamePlaceholder")}
                className="auth-field__input"
              />
            </div>
          </Field>

          <div className="auth-form__row">
            <Field label={t("register.sector")}>
              <Input value={sector} onChange={(e) => setSector(e.target.value)} />
            </Field>
            <Field label={t("register.city")}>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
          </div>

          <Field label={t("register.adminName")} required>
            <div className="auth-field">
              <User className="auth-field__icon" aria-hidden />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("register.adminNamePlaceholder")}
                className="auth-field__input"
              />
            </div>
          </Field>

          <Field label={t("login.email")} required>
            <div className="auth-field">
              <Mail className="auth-field__icon" aria-hidden />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.sa"
                dir="ltr"
                className="auth-field__input text-right"
              />
            </div>
          </Field>

          <Field label={t("login.password")} required>
            <div className="auth-field">
              <Lock className="auth-field__icon" aria-hidden />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="auth-field__input text-right"
              />
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm text-steel-600 dark:text-steel-300">
            <input
              type="checkbox"
              checked={emailConfirmed}
              onChange={(e) => setEmailConfirmed(e.target.checked)}
            />
            {t("register.emailConfirmed")}
          </label>

          {error && <p className="auth-form__error">{error}</p>}

          <button type="submit" className="auth-submit">
            <UserPlus className="h-5 w-5" />
            {t("register.submit")}
          </button>
        </div>

        <footer className="auth-card__footer">
          <p className="auth-footer-link">
            {t("register.hasAccount")}{" "}
            <Link to="/login" className="auth-link">
              {t("login.title")}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </p>
        </footer>
      </form>
    </AuthShell>
  );
}
