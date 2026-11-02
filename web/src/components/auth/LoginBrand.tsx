import { motion } from "framer-motion";
import { publicAsset } from "../../lib/assets";

type LoginBrandProps = {
  variant?: "hero" | "bar";
};

export function LoginBrand({ variant = "hero" }: LoginBrandProps) {
  return (
    <motion.div
      className={`login-brand login-brand--${variant}`}
      initial={{ opacity: 0, y: variant === "bar" ? -8 : -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="login-brand__logo-wrap">
        <img src={publicAsset("/logo-2.png")} alt="" className="login-brand__logo" />
      </span>
      <div className="login-brand__text">
        <span className="login-brand__name">شركة نماء للتطوير</span>
        <span className="login-brand__sector">قطاع تقنية المعلومات</span>
      </div>
    </motion.div>
  );
}
