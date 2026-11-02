import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Lock } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { AuthShell } from "../components/auth/AuthShell";
import { Field, Input } from "../components/ui/Input";

export function ChangePassword() {
  const { user, changeOwnPassword, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    const res = changeOwnPassword(current, next);
    if (!res.ok) {
      setError(res.reason || "تعذّر تحديث كلمة المرور.");
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <AuthShell>
      <form onSubmit={submit} className="login-card login-card--premium">
        <header className="auth-card__head">
          <span className="auth-card__icon-badge">
            <Lock className="h-5 w-5" />
          </span>
          <div className="auth-card__titles">
            <h2 className="auth-card__heading">تغيير كلمة المرور</h2>
            <p className="auth-card__sub">
              مطلوب عند أول دخول بعد استلام كلمة مرور مؤقتة — {user.name}
            </p>
          </div>
        </header>

        <div className="auth-card__section auth-card__section--fields space-y-3">
          <Field label="كلمة المرور الحالية / المؤقتة" required>
            <div className="auth-field">
              <KeyRound className="auth-field__icon" aria-hidden />
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="auth-field__input"
                dir="ltr"
              />
            </div>
          </Field>
          <Field label="كلمة المرور الجديدة" required>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              dir="ltr"
            />
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
          <button
            type="button"
            className="text-sm font-bold text-steel-500 hover:underline"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            تسجيل الخروج
          </button>
          <button type="submit" className="auth-submit">
            حفظ والمتابعة
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
