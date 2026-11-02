import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "ar" | "en";

const LS_LOCALE = "pms_core_locale";

type Dict = Record<string, string>;

const AR: Dict = {
  "brand.company": "برينز فالي",
  "brand.tagline": "استشارات الإدارة والتقنية",
  "brand.systemName": "منظومة إدارة وتنظيم المشاريع",
  "brand.systemSubtitle": "بوابة إدارة المشاريع — برينز فالي",
  "hero.titleLine": "منظومة إدارة",
  "hero.titleAccent": "وتنظيم المشاريع",
  "login.title": "تسجيل الدخول",
  "login.email": "البريد الإلكتروني",
  "login.password": "كلمة المرور",
  "login.passwordPlaceholder": "أدخل كلمة المرور",
  "login.forgot": "نسيت كلمة المرور؟",
  "login.submit": "دخول",
  "login.submitting": "جارٍ التحقق…",
  "login.quickTitle": "دخول سريع بحسب الدور",
  "login.newOrg": "مؤسسة جديدة؟",
  "login.register": "تسجيل منشأة",
  "login.showPassword": "إظهار كلمة المرور",
  "login.hidePassword": "إخفاء كلمة المرور",
  "login.errorGeneric": "تعذّر تسجيل الدخول.",
  "login.errorNoDemoUser": "لا يوجد مستخدم تجريبي لهذا الدور.",
  "mfa.title": "التحقق بخطوتين",
  "mfa.sub": "أدخل أي {n} أرقام للمتابعة (عرض تجريبي)",
  "mfa.code": "رمز التحقق",
  "mfa.submit": "تأكيد والدخول",
  "mfa.back": "رجوع إلى تسجيل الدخول",
  "mfa.trust": "MFA محاكى للعرض فقط — {company}",
  "mfa.error": "فشل التحقق.",
  "forgot.title": "استعادة كلمة المرور",
  "forgot.sub": "أدخل بريد الحساب ثم عيّن كلمة مرور جديدة (Demo)",
  "forgot.newPassword": "كلمة المرور الجديدة",
  "forgot.confirmPassword": "تأكيد كلمة المرور",
  "forgot.submit": "تحديث كلمة المرور",
  "forgot.back": "رجوع إلى تسجيل الدخول",
  "forgot.mismatch": "كلمتا المرور غير متطابقتين.",
  "forgot.error": "تعذّر إعادة التعيين.",
  "forgot.success": "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.",
  "role.orgAdmin": "مسؤول المؤسسة",
  "role.projectManager": "مدير مشروع",
  "role.member": "عضو فريق",
  "role.external": "مستخدم خارجي",
  "role.executive": "الإدارة العليا",
  "role.pr": "التواصل المؤسسي",
  "role.vendorAdmin": "مسؤول المورد",
  "lang.ar": "عربي",
  "lang.en": "English",
};

const EN: Dict = {
  "brand.company": "Brains Valley",
  "brand.tagline": "Management and Technology Consulting",
  "brand.systemName": "Project Management System",
  "brand.systemSubtitle": "Project Management Portal — Brains Valley",
  "hero.titleLine": "Project Management",
  "hero.titleAccent": "and Organization System",
  "login.title": "Sign in",
  "login.email": "Email",
  "login.password": "Password",
  "login.passwordPlaceholder": "Enter your password",
  "login.forgot": "Forgot password?",
  "login.submit": "Sign in",
  "login.submitting": "Verifying…",
  "login.quickTitle": "Quick sign-in by role",
  "login.newOrg": "New organization?",
  "login.register": "Register entity",
  "login.showPassword": "Show password",
  "login.hidePassword": "Hide password",
  "login.errorGeneric": "Unable to sign in.",
  "login.errorNoDemoUser": "No demo user found for this role.",
  "mfa.title": "Two-step verification",
  "mfa.sub": "Enter any {n} digits to continue (demo)",
  "mfa.code": "Verification code",
  "mfa.submit": "Confirm and sign in",
  "mfa.back": "Back to sign in",
  "mfa.trust": "Simulated MFA for demo only — {company}",
  "mfa.error": "Verification failed.",
  "forgot.title": "Reset password",
  "forgot.sub": "Enter the account email, then set a new password (Demo)",
  "forgot.newPassword": "New password",
  "forgot.confirmPassword": "Confirm password",
  "forgot.submit": "Update password",
  "forgot.back": "Back to sign in",
  "forgot.mismatch": "Passwords do not match.",
  "forgot.error": "Unable to reset password.",
  "forgot.success": "Password updated. You can sign in now.",
  "role.orgAdmin": "Organization admin",
  "role.projectManager": "Project manager",
  "role.member": "Team member",
  "role.external": "External user",
  "role.executive": "Executive",
  "role.pr": "Corporate communications",
  "role.vendorAdmin": "Vendor admin",
  "lang.ar": "عربي",
  "lang.en": "English",
};

const DICTS: Record<Locale, Dict> = { ar: AR, en: EN };

interface LocaleCtx {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LocaleCtx | null>(null);

function readInitialLocale(): Locale {
  const saved = localStorage.getItem(LS_LOCALE);
  if (saved === "ar" || saved === "en") return saved;
  return "ar";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LS_LOCALE, next);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let value = DICTS[locale][key] ?? DICTS.ar[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replaceAll(`{${k}}`, String(v));
        }
      }
      return value;
    },
    [locale],
  );

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
