import { motion } from "framer-motion";
import { BRAND } from "../../lib/brand";
import { useLocale } from "../../store/LocaleContext";

type LoginBrandProps = {
  variant?: "hero" | "bar";
};

export function LoginBrand({ variant = "hero" }: LoginBrandProps) {
  const { t } = useLocale();

  return (
    <motion.div
      className={`login-brand login-brand--${variant}`}
      initial={{ opacity: 0, y: variant === "bar" ? -8 : -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="login-brand__logo-wrap" title={t("brand.company")}>
        <img
          src={BRAND.logoLocal}
          alt={t("brand.company")}
          className="login-brand__logo"
          onError={(e) => {
            e.currentTarget.src = BRAND.logoUrl;
          }}
        />
      </span>
      <div className="login-brand__text">
        <span className="login-brand__name">{t("brand.company")}</span>
        <span className="login-brand__sector">{t("brand.adminSector")}</span>
      </div>
    </motion.div>
  );
}
