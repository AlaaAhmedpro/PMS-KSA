import { Eye, FileText } from "lucide-react";
import { formatNotificationDateTime, fileSize } from "../../lib/format";
import type { ActionEntry, Attachment } from "../../lib/types";

export function ActionEntryCard({
  action,
  onPreview,
}: {
  action: ActionEntry;
  onPreview: (a: Attachment) => void;
}) {
  return (
    <div className="rounded-2xl border border-steel-200 bg-steel-50/50 p-4 dark:border-steel-700 dark:bg-steel-800/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-steel-800 dark:text-steel-100">
            <span className="text-brand-600 dark:text-brand-400">
              {action.actorTitle}
            </span>
            <span className="mx-1.5 text-steel-400">—</span>
            {action.actorName}
          </p>
          <p className="mt-1 text-xs font-semibold text-steel-500 dark:text-steel-400">
            {formatNotificationDateTime(action.at)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-steel-700 dark:text-steel-200">
        {action.text}
      </p>

      {action.attachments.length > 0 && (
        <div className="mt-4 rounded-xl border border-steel-200 bg-white p-3 dark:border-steel-700 dark:bg-steel-900">
          <p className="mb-2 text-xs font-bold text-steel-500 dark:text-steel-400">
            مرفقات رفعها ({action.actorTitle} — {action.actorName})
          </p>
          <div className="space-y-2">
            {action.attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-steel-100 bg-steel-50 px-3 py-2 dark:border-steel-800 dark:bg-steel-800/60"
              >
                <FileText className="h-4 w-4 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-steel-700 dark:text-steel-200">
                    {a.name}
                  </p>
                  <p className="text-[11px] text-steel-400">{fileSize(a.size)}</p>
                </div>
                {a.dataUrl && (
                  <button
                    type="button"
                    onClick={() => onPreview(a)}
                    className="rounded-lg p-1.5 text-steel-400 hover:bg-brand-500/10 hover:text-brand-600"
                    title="استعراض"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
