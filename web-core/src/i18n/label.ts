import type { Locale } from "./messages";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** Resolve a domain label; falls back to the raw id if key missing. */
export function labelOf(
  t: TFn,
  prefix: string,
  id: string | null | undefined,
): string {
  if (!id) return "—";
  const key = `${prefix}.${id}`;
  const value = t(key);
  return value === key ? id : value;
}

export function projectStatusLabel(t: TFn, id: string): string {
  return labelOf(t, "status.project", id);
}

export function taskStatusLabel(t: TFn, id: string): string {
  return labelOf(t, "status.task", id);
}

export function recordStatusLabel(t: TFn, id: string): string {
  return labelOf(t, "status.record", id);
}

export function priorityLabel(t: TFn, id: string): string {
  return labelOf(t, "priority", id);
}

export function permissionLabel(t: TFn, id: string): string {
  return labelOf(t, "permission", id);
}

export function activityKindLabel(t: TFn, id: string): string {
  return labelOf(t, "activity", id);
}

export function materialStatusLabel(t: TFn, id: string): string {
  return labelOf(t, "status.material", id);
}

export function stageStatusLabel(t: TFn, id: string): string {
  return labelOf(t, "status.stage", id);
}

export function entityTypeLabel(t: TFn, type: string): string {
  return labelOf(t, "entity", type);
}

export function relationshipTypeLabel(t: TFn, key: string): string {
  return labelOf(t, "relationship", key);
}

export function kindLabel(
  t: TFn,
  kind: "project" | "task",
  plural = false,
): string {
  return t(plural ? `kind.${kind}.plural` : `kind.${kind}`);
}

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}
