import { motion } from "framer-motion";
import { BRAND } from "../../lib/brand";
import { useLocale } from "../../store/LocaleContext";
import { LoginBrand } from "./LoginBrand";
import { LoginLangSwitch } from "./LoginLangSwitch";

export function LoginHero() {
  const { dir, t } = useLocale();

  return (
    <div className="login-hero__content" dir={dir}>
      <div className="login-hero__top">
        <LoginBrand variant="hero" />
        <LoginLangSwitch />
      </div>

      <motion.div
        className="login-hero__center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="login-hero__title">
          <span className="login-hero__title-row">
            <img
              src={BRAND.systemLogoLocal}
              alt={t("brand.systemName")}
              className="login-hero__title-logo"
            />
            <span className="login-hero__title-copy">
              <span className="login-hero__title-line">{t("hero.titleLine")}</span>
              <span className="login-hero__title-accent">{t("hero.titleAccent")}</span>
            </span>
          </span>
        </h1>
        <p className="login-hero__tagline">{t("brand.systemSubtitle")}</p>
      </motion.div>
    </div>
  );
}
