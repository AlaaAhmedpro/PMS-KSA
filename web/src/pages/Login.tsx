import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Shield,
} from "lucide-react";
import type { User } from "../lib/types";
import { useAuth } from "../store/AuthContext";
import { AuthShell } from "../components/auth/AuthShell";
import { Field, Input } from "../components/ui/Input";

type QuickRoleItem = {
  label: string;
  findUser: (users: User[]) => User | undefined;
};

const QUICK_ROW_1: QuickRoleItem[] = [
  { label: "مدير النظام", findUser: (us) => us.find((u) => u.role === "super_admin") },
  { label: "مسؤول المنصة", findUser: (us) => us.find((u) => u.role === "platform_admin") },
  { label: "مكتب PMO", findUser: (us) => us.find((u) => u.role === "planning") },
  { label: "مدير فرع", findUser: (us) => us.find((u) => u.role === "branch_manager") },
];

const QUICK_ROW_2: QuickRoleItem[] = [
  { label: "التواصل المؤسسي", findUser: (us) => us.find((u) => u.role === "pr") },
  { label: "الإدارة العليا", findUser: (us) => us.find((u) => u.role === "executive") },
  { label: "عضو فريق", findUser: (us) => us.find((u) => u.email === "employee@namaa.sa") },
  { label: "موارد بشرية", findUser: (us) => us.find((u) => u.email === "hr@namaa.sa") },
];

function QuickRoleTile({
  item,
  index,
  onSelect,
  users,
}: {
  item: QuickRoleItem;
  index: number;
  onSelect: (item: QuickRoleItem) => void;
  users: User[];
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
        <span className="auth-quick-btn__role">{item.label}</span>
        <span className="auth-quick-btn__name">{user?.name ?? "—"}</span>
      </span>
    </motion.button>
  );
}

export function Login() {
  const { login, loginAs, users } = useAuth();
  const quickUsers = users.filter((u) => u.active !== false);
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@namaa.sa");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(email);
    if (res.ok) navigate("/");
    else setError(res.reason || "تعذّر تسجيل الدخول. جرّب الدخول السريع بالأسفل.");
  };

  const quickLogin = (item: QuickRoleItem) => {
    const user = item.findUser(quickUsers);
    if (user) {
      loginAs(user);
      navigate("/");
      return;
    }
    setError("لا يوجد مستخدم تجريبي لهذا الدور.");
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
          <h2 className="auth-card__heading">تسجيل الدخول</h2>
          <p className="auth-card__sub">يرجى إدخال بياناتك للوصول إلى حسابك</p>
        </header>

        <div className="auth-card__section auth-card__section--fields">
          <Field label="البريد الإلكتروني" required>
            <div className="auth-field">
              <Mail className="auth-field__icon" aria-hidden />
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="name@namaa.sa"
                dir="ltr"
                className="auth-field__input text-right"
              />
            </div>
          </Field>

          <Field label="كلمة المرور" required>
            <div className="auth-field">
              <Lock className="auth-field__icon" aria-hidden />
              <Input
                type={showPassword ? "text" : "password"}
                defaultValue="demo1234"
                placeholder="أدخل كلمة المرور"
                className="auth-field__input auth-field__input--password text-right"
              />
              <button
                type="button"
                className="auth-field__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <div className="auth-forgot-row">
            <button type="button" className="auth-forgot">
              نسيت كلمة المرور؟
            </button>
          </div>

          {error && (
            <motion.p
              className="auth-form__error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}

          <button type="submit" className="auth-submit">
            <LogIn className="h-5 w-5" />
            دخول
          </button>
        </div>

        <div className="auth-card__section auth-card__section--quick">
          <div className="auth-divider">
            <span className="auth-divider__line" />
            <span className="auth-divider__text">دخول سريع بحسب الدور</span>
            <span className="auth-divider__line" />
          </div>

          <div className="auth-quick-rows">
            <div className="auth-quick-row">
              {QUICK_ROW_1.map((item, i) => (
                <QuickRoleTile
                  key={item.label}
                  item={item}
                  index={i}
                  users={quickUsers}
                  onSelect={quickLogin}
                />
              ))}
            </div>
            <div className="auth-quick-row auth-quick-row--second">
              {QUICK_ROW_2.map((item, i) => (
                <QuickRoleTile
                  key={item.label}
                  item={item}
                  index={QUICK_ROW_1.length + i}
                  users={quickUsers}
                  onSelect={quickLogin}
                />
              ))}
            </div>
          </div>
        </div>

        <footer className="auth-card__footer">
          <p className="auth-trust">
            <Shield className="h-3 w-3" aria-hidden />
            اتصال آمن ومشفّر
          </p>
          <p className="auth-footer-link">
            <span className="auth-footer-muted">ليس لديك حساب؟</span>{" "}
            <Link to="/register" className="auth-link">
              تسجيل حساب جديد
            </Link>
          </p>
        </footer>
      </form>
    </AuthShell>
  );
}
