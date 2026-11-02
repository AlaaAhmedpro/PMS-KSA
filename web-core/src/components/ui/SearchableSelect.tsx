import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** When false, show full option label without ellipsis */
  truncateLabel?: boolean;
  "aria-label"?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "اختر...",
  searchPlaceholder = "بحث...",
  disabled,
  className,
  truncateLabel = true,
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q),
      )
    : options;

  return (
    <div className={cn("searchable-select relative", className)} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-steel-300 bg-white px-3.5 py-2.5 text-sm text-steel-800 transition-colors focus-ring dark:border-steel-700 dark:bg-steel-900 dark:text-steel-100",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 text-start",
            truncateLabel ? "truncate" : "whitespace-nowrap",
            !selected && "text-steel-400",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-steel-400" />
      </button>

      {open && (
        <div className="absolute inset-inline-0 z-40 mt-1 overflow-hidden rounded-md border border-steel-200 bg-white shadow-card dark:border-steel-700 dark:bg-steel-900">
          <div className="flex items-center gap-2 border-b border-steel-100 px-3 py-2 dark:border-steel-800">
            <Search className="h-4 w-4 shrink-0 text-steel-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-start text-sm outline-none placeholder:text-steel-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1 [scrollbar-width:thin]">
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm text-steel-700 transition-colors hover:bg-brand-500/10 dark:text-steel-200"
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {o.value === value && (
                  <Check className="h-4 w-4 shrink-0 text-brand-500" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-center text-xs text-steel-400">
                لا توجد نتائج
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
