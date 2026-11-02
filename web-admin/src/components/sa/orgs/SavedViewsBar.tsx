import { cn } from "../../../lib/cn";

export type SavedViewDef = {
  id: string;
  label: string;
  builtin?: boolean;
};

export function SavedViewsBar({
  views,
  activeId,
  onSelect,
  onSaveCurrent,
  onDelete,
}: {
  views: SavedViewDef[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onSaveCurrent?: () => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onSelect(v.id)}
          className={cn(
            "rounded border px-2.5 py-1 text-xs font-semibold transition",
            activeId === v.id
              ? "border-blue-300 bg-blue-50 text-blue-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
          )}
        >
          {v.label}
          {!v.builtin && onDelete ? (
            <span
              role="button"
              tabIndex={0}
              className="ms-1.5 text-slate-400 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(v.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onDelete(v.id);
                }
              }}
            >
              ×
            </span>
          ) : null}
        </button>
      ))}
      {onSaveCurrent ? (
        <button
          type="button"
          onClick={onSaveCurrent}
          className="rounded border border-dashed border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-700"
        >
          حفظ العرض الحالي
        </button>
      ) : null}
    </div>
  );
}
