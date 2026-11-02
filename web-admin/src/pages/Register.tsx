import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, User, UserPlus } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { useRbac } from "../store/RbacContext";
import { useData } from "../store/DataStore";
import { AuthShell } from "../components/auth/AuthShell";
import { Field, Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";

export function Register() {
  const { register } = useAuth();
  const { roles } = useRbac();
  const { branches, departments } = useData();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("employee");
  const [branchId, setBranchId] = useState("riyadh");
  const [departmentId, setDepartmentId] = useState("pm");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    register({ name, email, role, branchId, departmentId });
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
            <UserPlus className="h-5 w-5" />
          </span>
          <div className="auth-card__titles">
            <h2 className="auth-card__heading">إنشاء حساب جديد</h2>
            <p className="auth-card__sub">أدخل بياناتك للانضمام إلى منظومة المتابعة</p>
          </div>
        </header>

        <div className="auth-card__section auth-card__section--fields auth-card__section--scroll">
          <Field label="الاسم بالكامل" required>
            <div className="auth-field">
              <User className="auth-field__icon" aria-hidden />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: محمد أحمد"
                className="auth-field__input"
              />
            </div>
          </Field>

          <Field label="البريد الإلكتروني" required>
            <div className="auth-field">
              <Mail className="auth-field__icon" aria-hidden />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@namaa.sa"
                dir="ltr"
                className="auth-field__input text-right"
              />
            </div>
          </Field>

          <Field label="الدور / الصلاحية" required>
            <SearchableSelect
              value={role}
              onChange={setRole}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              searchPlaceholder="بحث في الأدوار..."
              className="auth-select"
            />
          </Field>

          <div className="auth-form__row">
            <Field label="الفرع / المنطقة">
              <SearchableSelect
                value={branchId}
                onChange={setBranchId}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                searchPlaceholder="بحث..."
                className="auth-select"
              />
            </Field>
            <Field label="الأدارات / الفروع">
              <SearchableSelect
                value={departmentId}
                onChange={setDepartmentId}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                searchPlaceholder="بحث..."
                className="auth-select"
              />
            </Field>
          </div>

          <Field label="كلمة المرور" required>
            <div className="auth-field">
              <Lock className="auth-field__icon" aria-hidden />
              <Input
                type="password"
                defaultValue="demo1234"
                dir="ltr"
                className="auth-field__input text-right"
              />
            </div>
          </Field>

          <button type="submit" className="auth-submit">
            <UserPlus className="h-5 w-5" />
            إنشاء الحساب والدخول
          </button>
        </div>

        <footer className="auth-card__footer">
          <p className="auth-footer-link">
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="auth-link">
              تسجيل الدخول
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </p>
        </footer>
      </form>
    </AuthShell>
  );
}
