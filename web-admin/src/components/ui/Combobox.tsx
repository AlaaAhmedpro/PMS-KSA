import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "../../lib/cn";

export interface ComboOption {
  id: string;
  name: string;
}

interface Props {
  options: ComboOption[];
  value?: string;
  onChange: (id: string) => void;
  onCreate?: (name: string) => ComboOption;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCreate?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "اختر...",
  searchPlaceholder = "بحث...",
  allowCreate = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase()),
  );
  const showCreate =
    allowCreate &&
    query.trim() &&
    !options.some((o) => o.name === query.trim()) &&
    onCreate;

  const handleCreate = () => {
    if (!onCreate) return;
    const created = onCreate(query.trim());
    onChange(created.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-steel-300 bg-white px-3.5 py-2.5 text-sm text-steel-800 transition-colors focus-ring dark:border-steel-700 dark:bg-steel-900 dark:text-steel-100"
      >
        <span className={cn(!selected && "text-steel-400")}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-steel-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-steel-200 bg-white shadow-card dark:border-steel-700 dark:bg-steel-900">
          <div className="flex items-center gap-2 border-b border-steel-100 px-3 py-2 dark:border-steel-800">
            <Search className="h-4 w-4 text-steel-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-steel-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm text-steel-700 transition-colors hover:bg-brand-500/10 dark:text-steel-200"
              >
                {o.name}
                {o.id === value && (
                  <Check className="h-4 w-4 text-brand-500" />
                )}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-500/10 dark:text-brand-400"
              >
                <Plus className="h-4 w-4" />
                إضافة "{query.trim()}"
              </button>
            )}
            {filtered.length === 0 && !showCreate && (
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
