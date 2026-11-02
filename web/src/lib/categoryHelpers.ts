import { SEED_CATEGORIES } from "./constants";
import type { CategoryItem } from "./types";

export function categoryLabel(
  categories: CategoryItem[],
  id: string,
): string {
  return (
    categories.find((c) => c.id === id)?.name ??
    SEED_CATEGORIES.find((c) => c.id === id)?.name ??
    id
  );
}
