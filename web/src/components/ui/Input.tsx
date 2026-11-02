import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

const base =
  "w-full rounded-xl border border-steel-300 bg-white px-3.5 py-2.5 text-sm text-steel-800 placeholder:text-steel-400 transition-colors focus-ring dark:border-steel-700 dark:bg-steel-900 dark:text-steel-100 disabled:bg-steel-100 dark:disabled:bg-steel-800";

export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-semibold text-steel-700 dark:text-steel-200">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-steel-400 dark:text-steel-500">{hint}</p>
      )}
    </div>
  );
}

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(base, "min-h-[90px] resize-y", className)} {...rest} />
  );
}

export function NativeSelect({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          base,
          "w-full cursor-pointer appearance-none bg-none pl-10",
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
    </div>
  );
}
