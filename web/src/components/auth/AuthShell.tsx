import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AuthBackground } from "./AuthBackground";
import { LoginBrand } from "./LoginBrand";
import { LoginHero } from "./LoginHero";
import { LoginCurveDivider } from "./LoginCurveDivider";

type AuthShellProps = {
  children: ReactNode;
  wide?: boolean;
};

export function AuthShell({ children, wide }: AuthShellProps) {
  useEffect(() => {
    document.documentElement.classList.add("auth-screen");
    document.body.classList.add("auth-screen");
    return () => {
      document.documentElement.classList.remove("auth-screen");
      document.body.classList.remove("auth-screen");
    };
  }, []);

  return (
    <div className="login-page login-page--glass auth-surface">
      <div className="login-page__fullscreen-bg" aria-hidden>
        <AuthBackground />
      </div>

      <LoginCurveDivider />

      <main className="login-main" dir="rtl">
        <div className="login-main__ambient" aria-hidden />
        <div className="login-main__ambient login-main__ambient--soft" aria-hidden />
        <div className="login-page__card-glow" aria-hidden />

        <div className="login-main__brand-slot">
          <LoginBrand variant="bar" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={`login-page__card-wrap${wide ? " login-page__card-wrap--wide" : ""}`}
        >
          {children}
        </motion.div>
      </main>

      <aside className="login-hero" aria-hidden={false}>
        <LoginHero />
      </aside>
    </div>
  );
}
