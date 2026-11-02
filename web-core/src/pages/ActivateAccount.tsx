import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { AuthShell } from "../components/auth/AuthShell";
import { Field, Input } from "../components/ui/Input";

export function ActivateAccount() {
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
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    const res = activateAccount(token, password);
    if (!res.ok) {
      setError(res.reason || "تعذّر تفعيل الحساب.");
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
            <h2 className="auth-card__heading">تفعيل الحساب</h2>
            <p className="auth-card__sub">
              أكّد رمز التفعيل ثم عيّن كلمة مرور جديدة
            </p>
          </div>
        </header>

        <div className="auth-card__section auth-card__section--fields space-y-3">
          <Field label="رمز التفعيل" required>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              dir="ltr"
              placeholder={tokenHint || "act-…"}
            />
          </Field>
          <Field label="كلمة المرور الجديدة" required>
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
          <Field label="تأكيد كلمة المرور" required>
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
            رجوع لتسجيل الدخول
          </Link>
          <button type="submit" className="auth-submit">
            تفعيل والمتابعة
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
