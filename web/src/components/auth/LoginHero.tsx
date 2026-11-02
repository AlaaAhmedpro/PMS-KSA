import { motion } from "framer-motion";
import { publicAsset } from "../../lib/assets";
import { LoginBrand } from "./LoginBrand";

export function LoginHero() {
  return (
    <div className="login-hero__content" dir="rtl">
      <LoginBrand variant="hero" />

      <motion.div
        className="login-hero__center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="login-hero__title">
          <span className="login-hero__title-row">
            <img src={publicAsset("/logo-2.png")} alt="" className="login-hero__title-logo" />
            <span className="login-hero__title-copy">
              <span className="login-hero__title-line">منظومة متابعة</span>
              <span className="login-hero__title-accent">المشاريع والمهام</span>
            </span>
          </span>
        </h1>
        <p className="login-hero__tagline">بوابة الموظفين — شركة نماء للتطوير</p>
      </motion.div>
    </div>
  );
}
