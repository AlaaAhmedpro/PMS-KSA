import { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { SearchableSelect } from "../ui/SearchableSelect";
import {
  RELATIONSHIP_TYPES,
  entityLabelAr,
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
          label: `${entityLabelAr(e.type)} — ${e.name}`,
        })),
    [entities, def, sourceType],
  );

  const targetOptions = useMemo(
    () =>
      entities
        .filter((e) => def.allowedTargets.includes(e.type))
        .filter((e) => !targetType || e.type === targetType)
        .map((e) => ({
          value: `${e.type}:${e.id}`,
          label: `${entityLabelAr(e.type)} — ${e.name}`,
        })),
    [entities, def, targetType],
  );

  const typeOptions = RELATIONSHIP_TYPES.filter((t) =>
    policy.allowedRelationshipTypes.includes(t.key),
  ).map((t) => ({
    value: t.key,
    label: t.nameAr,
  }));

  const entityTypeOptions = (
    types: StrategicEntityType[],
  ): { value: string; label: string }[] =>
    types.map((t) => ({ value: t, label: entityLabelAr(t) }));

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
    setSuccess("تم حفظ العلاقة. لم يُحذف أي كيان.");
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
      title="إضافة علاقة"
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
            إلغاء
          </Button>
          <Button onClick={save}>حفظ العلاقة</Button>
        </div>
      }
    >
      <div className="space-y-3 p-1">
        <p className="text-xs text-steel-500">{def.descriptionAr}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نوع العلاقة" required>
            <SearchableSelect
              value={relationshipType}
              onChange={(v) => {
                const next = v as RelationshipTypeKey;
                setRelationshipType(next);
                const d = getRelationshipDef(next);
                setSourceType(d.allowedSources[0]);
                setTargetType(d.allowedTargets[0]);
                setSourceId(presetSource?.id && d.allowedSources.includes(presetSource.type) ? presetSource.id : "");
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
            <p>اتجاهية: {def.isDirectional ? "نعم" : "لا"}</p>
            <p>هرمية: {def.isHierarchical ? "نعم" : "لا"}</p>
            <p>دورات: {def.allowCycles ? "مسموحة" : "ممنوعة"}</p>
            <p className="mt-1">العلاقات النشطة: {relationships.filter((r) => r.isActive).length}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نوع المصدر" required>
            <SearchableSelect
              value={sourceType}
              onChange={(v) => {
                setSourceType(v as StrategicEntityType);
                setSourceId("");
              }}
              options={entityTypeOptions(def.allowedSources)}
            />
          </Field>
          <Field label="الكيان المصدر" required>
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
          <Field label="نوع الهدف" required>
            <SearchableSelect
              value={targetType}
              onChange={(v) => {
                setTargetType(v as StrategicEntityType);
                setTargetId("");
              }}
              options={entityTypeOptions(def.allowedTargets)}
            />
          </Field>
          <Field label="الكيان الهدف" required>
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

        <Field label="الوصف / المبرر">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="اختياري"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ساري من">
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </Field>
          <Field label="ساري إلى">
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
