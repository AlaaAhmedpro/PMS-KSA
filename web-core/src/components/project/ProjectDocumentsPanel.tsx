import { Card } from "../ui/Card";
import { WorkAttachmentsBlock } from "./WorkExtras";
import type { Project } from "../../models/domain";
import { useLocale } from "../../store/LocaleContext";

export function ProjectDocumentsPanel({ project }: { project: Project }) {
  const { t } = useLocale();
  return (
    <Card className="space-y-3 p-4">
      <p className="text-xs text-steel-500">{t("projectDocuments.hint")}</p>
      <WorkAttachmentsBlock
        projectId={project.id}
        entityType="project"
        entityId={project.id}
      />
    </Card>
  );
}
