import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { useLocale } from "../store/LocaleContext";
import { AuthShell } from "../components/auth/AuthShell";
import { Field, Input } from "../components/ui/Input";

export function ActivateAccount() {
  const { t, L } = useLocale();
  const { activateAccount } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const tokenHint = useMemo(() => params.get("token"), [params]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("activate.mismatch"));
      return;
    }
    const res = activateAccount(token, password);
    if (!res.ok) {
      setError(L(res.reason) || t("activate.error"));
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <AuthShell>
      <form onSubmit={submit} className="login-card login-card--premium">
        <header className="auth-card__head">
          <span className="auth-card__icon-badge">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="auth-card__titles">
            <h2 className="auth-card__heading">{t("activate.title")}</h2>
            <p className="auth-card__sub">{t("activate.subtitle")}</p>
          </div>
        </header>

        <div className="auth-card__section auth-card__section--fields space-y-3">
          <Field label={t("activate.token")} required>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              dir="ltr"
              placeholder={tokenHint || "act-…"}
            />
          </Field>
          <Field label={t("activate.newPassword")} required>
            <div className="auth-field">
              <KeyRound className="auth-field__icon" aria-hidden />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-field__input"
                dir="ltr"
              />
            </div>
          </Field>
          <Field label={t("activate.confirmPassword")} required>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              dir="ltr"
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="auth-card__footer flex flex-wrap items-center justify-between gap-2">
          <Link to="/login" className="text-sm font-bold text-steel-500 hover:underline">
            {t("activate.backLogin")}
          </Link>
          <button type="submit" className="auth-submit">
            {t("activate.submit")}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
