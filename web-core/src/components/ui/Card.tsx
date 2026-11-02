import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn("surface rounded-2xl", className)} {...rest}>
      {children}
    </div>
  );
}

type HeaderVariant = "brand" | "violet" | "sky" | "red" | "amber" | "emerald";

const headerIconStyles: Record<HeaderVariant, string> = {
  brand: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  variant = "brand",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: HeaderVariant;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-steel-100/80 p-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:p-5 sm:pb-4 dark:border-steel-800/80">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              headerIconStyles[variant],
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-steel-800 dark:text-steel-100">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-relaxed text-steel-500 dark:text-steel-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="w-full min-w-0 shrink-0 sm:w-auto sm:pt-0.5 [&_.searchable-select]:w-full sm:[&_.searchable-select]:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}
