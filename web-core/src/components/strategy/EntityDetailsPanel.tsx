import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "../ui/Button";
import {
  detailPath,
  findEntityName,
  formatEntityTitle,
  primaryPlacement,
  relationshipsForEntity,
  type StrategicEntityRef,
} from "../../lib/strategicEntities";
import { getRelationshipDef } from "../../lib/relationshipRules";
import { useHierarchy } from "../../store/HierarchyStore";
import { useAuth } from "../../store/AuthContext";
import { useLocale } from "../../store/LocaleContext";
import {
  entityTypeLabel,
  projectStatusLabel,
  relationshipTypeLabel,
} from "../../i18n/label";
import type { ProjectStatus } from "../../models/domain";
import { cn } from "../../lib/cn";

export function EntityDetailsPanel({
  entity,
  entities,
  onClose,
  onSelectEntity,
  onAddRelationship,
}: {
  entity: StrategicEntityRef;
  entities: StrategicEntityRef[];
  onClose: () => void;
  onSelectEntity: (type: StrategicEntityRef["type"], id: string) => void;
  onAddRelationship: () => void;
}) {
  const { t } = useLocale();
  const {
    projects,
    programs,
    relationships,
    relationshipHistory,
    removeRelationship,
  } = useHierarchy();
  const { user, users } = useAuth();
  const { incoming, outgoing } = relationshipsForEntity(
    relationships,
    entity.type,
    entity.id,
  );
  const placement = primaryPlacement(
    entity,
    relationships,
    projects,
    programs,
  );
  const project = projects.find((p) => p.id === entity.id);
  const history = relationshipHistory
    .filter(
      (h) =>
        (h.sourceType === entity.type && h.sourceId === entity.id) ||
        (h.targetType === entity.type && h.targetId === entity.id),
    )
    .slice(0, 8);

  const formatSar = (amount: number) =>
    `${amount.toLocaleString("en-US")} ${t("common.currencySar")}`;

  return (
    <aside className="flex h-full flex-col border-s border-steel-200 bg-white dark:border-steel-800 dark:bg-steel-900">
      <div className="flex items-start justify-between gap-2 border-b border-steel-100 px-4 py-3 dark:border-steel-800">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-steel-400">
            {entityTypeLabel(t, entity.type)}
          </p>
          <h3 className="truncate text-sm font-extrabold text-steel-800 dark:text-steel-100">
            {entity.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-steel-400 hover:bg-steel-100 dark:hover:bg-steel-800"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <section className="space-y-1">
          <h4 className="text-[11px] font-bold text-steel-400">
            {t("entityDetails.overview")}
          </h4>
          <p className="text-xs text-steel-600 dark:text-steel-300">
            {entity.description || "—"}
          </p>
          {entity.status ? (
            <p className="text-xs">
              <span className="text-steel-400">{t("common.status")}: </span>
              {projectStatusLabel(t, entity.status as ProjectStatus) ??
                entity.status}
            </p>
          ) : null}
          {entity.ownerId ? (
            <p className="text-xs">
              <span className="text-steel-400">
                {t("entityDetails.owner")}:{" "}
              </span>
              {users.find((u) => u.id === entity.ownerId)?.name ?? "—"}
            </p>
          ) : null}
          {project ? (
            <>
              <p className="text-xs">
                <span className="text-steel-400">{t("common.budget")}: </span>
                {formatSar(project.budgetSar)}
              </p>
              <p className="text-xs">
                <span className="text-steel-400">{t("common.progress")}: </span>
                {project.progress}%
              </p>
            </>
          ) : null}
        </section>

        <section className="space-y-1">
          <h4 className="text-[11px] font-bold text-steel-400">
            {t("entityDetails.placement")}
          </h4>
          {placement ? (
            <p className="text-xs text-steel-600 dark:text-steel-300">
              {placement.label}
              {placement.parentType && placement.parentId ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    onClick={() =>
                      onSelectEntity(placement.parentType!, placement.parentId!)
                    }
                  >
                    {findEntityName(
                      entities,
                      placement.parentType,
                      placement.parentId,
                    )}
                  </button>
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-xs text-steel-400">
              {t("entityDetails.noPlacement")}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h4 className="text-[11px] font-bold text-steel-400">
            {t("entityDetails.outgoing", { n: outgoing.length })}
          </h4>
          {outgoing.length === 0 ? (
            <p className="text-xs text-steel-400">{t("entityDetails.none")}</p>
          ) : (
            outgoing.map((r) => (
              <RelationRow
                key={r.id}
                direction="out"
                typeLabel={relationshipTypeLabel(t, r.relationshipType)}
                visual={getRelationshipDef(r.relationshipType).visual}
                title={formatEntityTitle(
                  r.targetType,
                  findEntityName(entities, r.targetType, r.targetId),
                )}
                onOpen={() => onSelectEntity(r.targetType, r.targetId)}
                onRemove={() =>
                  removeRelationship(r.id, {
                    userId: user?.id,
                    reason: t("entityDetails.removeReason"),
                  })
                }
                removeLabel={t("entityDetails.removeRelation")}
              />
            ))
          )}
        </section>

        <section className="space-y-2">
          <h4 className="text-[11px] font-bold text-steel-400">
            {t("entityDetails.incoming", { n: incoming.length })}
          </h4>
          {incoming.length === 0 ? (
            <p className="text-xs text-steel-400">{t("entityDetails.none")}</p>
          ) : (
            incoming.map((r) => (
              <RelationRow
                key={r.id}
                direction="in"
                typeLabel={relationshipTypeLabel(t, r.relationshipType)}
                visual={getRelationshipDef(r.relationshipType).visual}
                title={formatEntityTitle(
                  r.sourceType,
                  findEntityName(entities, r.sourceType, r.sourceId),
                )}
                onOpen={() => onSelectEntity(r.sourceType, r.sourceId)}
                onRemove={() =>
                  removeRelationship(r.id, {
                    userId: user?.id,
                    reason: t("entityDetails.removeReason"),
                  })
                }
                removeLabel={t("entityDetails.removeRelation")}
              />
            ))
          )}
        </section>

        <section className="space-y-2">
          <h4 className="text-[11px] font-bold text-steel-400">
            {t("entityDetails.history")}
          </h4>
          {history.length === 0 ? (
            <p className="text-xs text-steel-400">{t("entityDetails.noEvents")}</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="rounded-lg border border-steel-100 px-2 py-1.5 text-[11px] dark:border-steel-800"
                >
                  <p className="font-semibold text-steel-700 dark:text-steel-200">
                    {h.action === "created"
                      ? t("entityDetails.action.created")
                      : h.action === "removed"
                        ? t("entityDetails.action.removed")
                        : h.action}{" "}
                    · {relationshipTypeLabel(t, h.relationshipType)}
                  </p>
                  <p className="text-steel-400">
                    {h.reason || "—"} ·{" "}
                    {new Date(h.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-steel-100 p-3 dark:border-steel-800">
        <Button className="flex-1" onClick={onAddRelationship}>
          {t("strategy.addRelationship")}
        </Button>
        <Link
          to={detailPath(entity.type, entity.id)}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-steel-200 px-3 py-2 text-sm font-semibold text-steel-700 hover:bg-steel-50 dark:border-steel-700 dark:text-steel-200"
        >
          {t("entityDetails.openDetails")}
        </Link>
      </div>
    </aside>
  );
}

function RelationRow({
  typeLabel,
  title,
  visual,
  onOpen,
  onRemove,
  removeLabel,
}: {
  direction: "in" | "out";
  typeLabel: string;
  title: string;
  visual: string;
  onOpen: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2 py-1.5",
        visual === "containment" && "border-emerald-200 dark:border-emerald-900",
        visual === "alignment" && "border-sky-200 dark:border-sky-900",
        visual === "dependency" && "border-amber-200 dark:border-amber-900",
        visual === "association" && "border-steel-200 dark:border-steel-700",
      )}
    >
      <p className="text-[10px] font-bold text-steel-400">{typeLabel}</p>
      <button
        type="button"
        onClick={onOpen}
        className="text-start text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        {title}
      </button>
      <div className="mt-1">
        <button
          type="button"
          onClick={onRemove}
          className="text-[10px] font-bold text-red-500 hover:underline"
        >
          {removeLabel}
        </button>
      </div>
    </div>
  );
}
