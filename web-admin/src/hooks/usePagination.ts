import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_DEFAULT = 10;
export const PAGE_SIZE_RECORDS = 20;

export function usePagination<T>(
  items: T[],
  pageSize: number,
  resetDeps: unknown[] = [],
) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const resetKey = JSON.stringify(resetDeps);
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return {
    page,
    setPage,
    totalPages,
    paginated,
    total,
    pageSize,
    rangeStart,
    rangeEnd,
  };
}
