import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "skeleton rounded-lg bg-steel-200/70 dark:bg-steel-800",
        className,
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="surface space-y-3 rounded-2xl p-5">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
