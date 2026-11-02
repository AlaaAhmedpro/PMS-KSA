import { Card } from "../ui/Card";
import { WorkAttachmentsBlock } from "./WorkExtras";
import type { Project } from "../../models/domain";

export function ProjectDocumentsPanel({ project }: { project: Project }) {
  return (
    <Card className="space-y-3 p-4">
      <p className="text-xs text-steel-500">
        مرفقات على مستوى المشروع فقط. مرفقات المراحل والمهام تُدار من تبويب
        المراحل.
      </p>
      <WorkAttachmentsBlock
        projectId={project.id}
        entityType="project"
        entityId={project.id}
      />
    </Card>
  );
}
