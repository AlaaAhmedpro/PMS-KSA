import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-steel-100 text-steel-400 dark:bg-steel-800">
        {icon || <Inbox className="h-7 w-7" />}
      </div>
      <div>
        <p className="font-bold text-steel-700 dark:text-steel-200">{title}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-steel-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
