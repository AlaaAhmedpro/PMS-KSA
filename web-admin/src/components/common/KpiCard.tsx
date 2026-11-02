import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone = "brand" | "amber" | "red" | "sky" | "steel";

const toneStyles: Record<Tone, { icon: string; value: string; ring: string }> = {
  brand: {
    icon: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
    value: "text-brand-600 dark:text-brand-400",
    ring: "hover:border-brand-500/40",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    value: "text-amber-600 dark:text-amber-400",
    ring: "hover:border-amber-500/40",
  },
  red: {
    icon: "bg-red-500/10 text-red-600 dark:text-red-400",
    value: "text-red-600 dark:text-red-400",
    ring: "hover:border-red-500/40",
  },
  sky: {
    icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    value: "text-sky-600 dark:text-sky-400",
    ring: "hover:border-sky-500/40",
  },
  steel: {
    icon: "bg-steel-500/10 text-steel-600 dark:text-steel-300",
    value: "text-steel-700 dark:text-steel-100",
    ring: "hover:border-steel-400/40",
  },
};

const accentBar: Record<Tone, string> = {
  brand: "bg-brand-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  sky: "bg-sky-500",
  steel: "bg-steel-400",
};

export function KpiCard({
  label,
  value,
  icon,
  tone = "steel",
  hint,
  pulse,
  delay = 0,
  featured,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
  pulse?: boolean;
  delay?: number;
  /** بطاقة بارزة في الصف الأول */
  featured?: boolean;
}) {
  const s = toneStyles[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        "dash-kpi group relative overflow-hidden rounded-2xl border border-steel-200/70 bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-steel-700/60 dark:bg-steel-900",
        s.ring,
        pulse && "animate-pulse-red",
        featured ? "p-5 md:p-6" : "p-4",
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", accentBar[tone])} />
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-semibold text-steel-500 dark:text-steel-400",
            featured ? "text-sm" : "text-xs",
          )}
        >
          {label}
        </p>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
            featured ? "h-11 w-11" : "h-9 w-9",
            s.icon,
          )}
        >
          {icon}
        </div>
      </div>
      <p
        className={cn(
          "mt-2 font-extrabold tabular-nums tracking-tight",
          featured ? "text-3xl md:text-4xl" : "text-2xl",
          s.value,
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-xs leading-relaxed text-steel-400 dark:text-steel-500">
          {hint}
        </p>
      )}
    </motion.div>
  );
}
