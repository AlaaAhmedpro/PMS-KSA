import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AUTH_SLIDE_INTERVAL_MS,
  AUTH_SLIDE_TRANSITION_S,
  AUTH_SLIDESHOW,
} from "../../lib/authSlides";

type AuthBackgroundProps = {
  mobile?: boolean;
};

export function AuthBackground({ mobile }: AuthBackgroundProps) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const fadeDuration = reduceMotion ? 0 : AUTH_SLIDE_TRANSITION_S;
  const slides = mobile ? AUTH_SLIDESHOW.slice(0, 1) : AUTH_SLIDESHOW;

  useEffect(() => {
    if (mobile || AUTH_SLIDESHOW.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % AUTH_SLIDESHOW.length);
    }, AUTH_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [mobile]);

  return (
    <div className={`login-page__bg${mobile ? " login-page__bg--mobile" : ""}`} aria-hidden>
      {slides.map((src, i) => (
        <motion.img
          key={`${mobile ? "m" : "d"}-${src}`}
          src={src}
          alt=""
          className="login-page__bg-img"
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "auto"}
          initial={false}
          animate={{
            opacity: mobile || i === index ? 1 : 0,
            scale: mobile || i === index ? 1 : 1,
          }}
          transition={{ duration: fadeDuration, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ zIndex: mobile || i === index ? 1 : 0 }}
        />
      ))}
      <div className="login-page__overlay" />
      {!mobile && (
        <>
          <div className="login-page__glow login-page__glow--1" />
          <div className="login-page__glow login-page__glow--2" />
        </>
      )}
    </div>
  );
}
