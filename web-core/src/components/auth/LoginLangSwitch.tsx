import { useLocale, type Locale } from "../../store/LocaleContext";

export function LoginLangSwitch() {
  const { locale, setLocale, t } = useLocale();

  const set = (next: Locale) => {
    if (next !== locale) setLocale(next);
  };

  return (
    <div className="login-lang" role="group" aria-label="Language">
      <button
        type="button"
        className={`login-lang__btn${locale === "ar" ? " is-active" : ""}`}
        onClick={() => set("ar")}
      >
        {t("lang.ar")}
      </button>
      <button
        type="button"
        className={`login-lang__btn${locale === "en" ? " is-active" : ""}`}
        onClick={() => set("en")}
      >
        {t("lang.en")}
      </button>
    </div>
  );
}
