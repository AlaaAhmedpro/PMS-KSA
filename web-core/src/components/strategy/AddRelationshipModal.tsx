import { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { SearchableSelect } from "../ui/SearchableSelect";
import {
  RELATIONSHIP_TYPES,
  getRelationshipDef,
} from "../../lib/relationshipRules";
import type { StrategicEntityRef } from "../../lib/strategicEntities";
import type {
  RelationshipTypeKey,
  StrategicEntityType,
} from "../../models/domain";
import { useHierarchy } from "../../store/HierarchyStore";
import { useAuth } from "../../store/AuthContext";
import { useOrgPortfolioPolicy } from "../../hooks/useOrgPortfolioPolicy";
import { useLocale } from "../../store/LocaleContext";
import { entityTypeLabel, relationshipTypeLabel } from "../../i18n/label";

export function AddRelationshipModal({
  open,
  onClose,
  entities,
  presetSource,
}: {
  open: boolean;
  onClose: () => void;
  entities: StrategicEntityRef[];
  presetSource?: { type: StrategicEntityType; id: string } | null;
}) {
  const { t } = useLocale();
  const { addRelationship, relationships } = useHierarchy();
  const { user } = useAuth();
  const { policy } = useOrgPortfolioPolicy();
  const [relationshipType, setRelationshipType] =
    useState<RelationshipTypeKey>("contains");

  useEffect(() => {
    if (!policy.allowedRelationshipTypes.includes(relationshipType)) {
      setRelationshipType(policy.allowedRelationshipTypes[0] ?? "related_to");
    }
  }, [policy.allowedRelationshipTypes, relationshipType]);
  const [sourceType, setSourceType] = useState<StrategicEntityType>(
    presetSource?.type ?? "portfolio",
  );
  const [sourceId, setSourceId] = useState(presetSource?.id ?? "");
  const [targetType, setTargetType] = useState<StrategicEntityType>("project");
  const [targetId, setTargetId] = useState("");
  const [description, setDescription] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  const def = getRelationshipDef(relationshipType);

  const sourceOptions = useMemo(
    () =>
      entities
        .filter((e) => def.allowedSources.includes(e.type))
        .filter((e) => !sourceType || e.type === sourceType)
        .map((e) => ({
          value: `${e.type}:${e.id}`,
          label: `${entityTypeLabel(t, e.type)} — ${e.name}`,
        })),
    [entities, def, sourceType, t],
  );

  const targetOptions = useMemo(
    () =>
      entities
        .filter((e) => def.allowedTargets.includes(e.type))
        .filter((e) => !targetType || e.type === targetType)
        .map((e) => ({
          value: `${e.type}:${e.id}`,
          label: `${entityTypeLabel(t, e.type)} — ${e.name}`,
        })),
    [entities, def, targetType, t],
  );

  const typeOptions = RELATIONSHIP_TYPES.filter((row) =>
    policy.allowedRelationshipTypes.includes(row.key),
  ).map((row) => ({
    value: row.key,
    label: relationshipTypeLabel(t, row.key),
  }));

  const entityTypeOptions = (
    types: StrategicEntityType[],
  ): { value: string; label: string }[] =>
    types.map((type) => ({ value: type, label: entityTypeLabel(t, type) }));

  const reset = () => {
    setRelationshipType("contains");
    setSourceType(presetSource?.type ?? "portfolio");
    setSourceId(presetSource?.id ?? "");
    setTargetType("project");
    setTargetId("");
    setDescription("");
    setEffectiveFrom("");
    setEffectiveTo("");
    setErrors({});
    setSuccess("");
  };

  const save = () => {
    setSuccess("");
    const res = addRelationship({
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationshipType,
      description: description.trim() || undefined,
      effectiveFrom: effectiveFrom || undefined,
      effectiveTo: effectiveTo || undefined,
      createdBy: user?.id,
      reason: description.trim() || undefined,
    });
    if (!res.ok) {
      setErrors(res.errors);
      return;
    }
    setErrors({});
    setSuccess(t("addRelationship.success"));
    setTimeout(() => {
      reset();
      onClose();
    }, 700);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("strategy.addRelationship")}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={save}>{t("addRelationship.save")}</Button>
        </div>
      }
    >
      <div className="space-y-3 p-1">
        <p className="text-xs text-steel-500">
          {t(`relationship.desc.${relationshipType}`)}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("addRelationship.field.type")} required>
            <SearchableSelect
              value={relationshipType}
              onChange={(v) => {
                const next = v as RelationshipTypeKey;
                setRelationshipType(next);
                const d = getRelationshipDef(next);
                setSourceType(d.allowedSources[0]);
                setTargetType(d.allowedTargets[0]);
                setSourceId(
                  presetSource?.id && d.allowedSources.includes(presetSource.type)
                    ? presetSource.id
                    : "",
                );
                setTargetId("");
                setErrors({});
              }}
              options={typeOptions}
            />
            {errors.type ? (
              <p className="mt-1 text-xs text-red-500">{errors.type}</p>
            ) : null}
          </Field>
          <div className="rounded-xl border border-steel-100 bg-steel-50/80 p-3 text-[11px] text-steel-500 dark:border-steel-800 dark:bg-steel-800/40">
            <p>
              {t("addRelationship.directional")}:{" "}
              {def.isDirectional ? t("common.yes") : t("common.no")}
            </p>
            <p>
              {t("addRelationship.hierarchical")}:{" "}
              {def.isHierarchical ? t("common.yes") : t("common.no")}
            </p>
            <p>
              {t("addRelationship.cycles")}:{" "}
              {def.allowCycles
                ? t("addRelationship.cyclesAllowed")
                : t("addRelationship.cyclesForbidden")}
            </p>
            <p className="mt-1">
              {t("addRelationship.activeCount", {
                n: relationships.filter((r) => r.isActive).length,
              })}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("addRelationship.field.sourceType")} required>
            <SearchableSelect
              value={sourceType}
              onChange={(v) => {
                setSourceType(v as StrategicEntityType);
                setSourceId("");
              }}
              options={entityTypeOptions(def.allowedSources)}
            />
          </Field>
          <Field label={t("addRelationship.field.sourceEntity")} required>
            <SearchableSelect
              value={sourceId ? `${sourceType}:${sourceId}` : ""}
              onChange={(v) => {
                const [, id] = v.split(":");
                setSourceId(id ?? "");
              }}
              options={sourceOptions}
            />
            {errors.source ? (
              <p className="mt-1 text-xs text-red-500">{errors.source}</p>
            ) : null}
          </Field>
          <Field label={t("addRelationship.field.targetType")} required>
            <SearchableSelect
              value={targetType}
              onChange={(v) => {
                setTargetType(v as StrategicEntityType);
                setTargetId("");
              }}
              options={entityTypeOptions(def.allowedTargets)}
            />
          </Field>
          <Field label={t("addRelationship.field.targetEntity")} required>
            <SearchableSelect
              value={targetId ? `${targetType}:${targetId}` : ""}
              onChange={(v) => {
                const [, id] = v.split(":");
                setTargetId(id ?? "");
              }}
              options={targetOptions}
            />
            {errors.target ? (
              <p className="mt-1 text-xs text-red-500">{errors.target}</p>
            ) : null}
          </Field>
        </div>

        <Field label={t("addRelationship.field.description")}>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("addRelationship.optionalPlaceholder")}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("addRelationship.field.effectiveFrom")}>
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </Field>
          <Field label={t("addRelationship.field.effectiveTo")}>
            <Input
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
            {errors.dates ? (
              <p className="mt-1 text-xs text-red-500">{errors.dates}</p>
            ) : null}
          </Field>
        </div>

        {errors.general ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {errors.general}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40">
            {success}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
