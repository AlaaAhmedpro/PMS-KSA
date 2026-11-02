import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-soft hover:shadow-glow",
  secondary:
    "bg-steel-100 text-steel-800 hover:bg-steel-200 dark:bg-steel-800 dark:text-steel-100 dark:hover:bg-steel-700",
  outline:
    "border border-steel-300 text-steel-700 hover:bg-steel-100 dark:border-steel-600 dark:text-steel-200 dark:hover:bg-steel-800",
  ghost:
    "text-steel-600 hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800",
  danger:
    "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
  icon: "h-9 w-9 justify-center",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-ring disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
