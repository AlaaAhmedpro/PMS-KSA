import { useEffect, useRef, useState } from "react";
import { Download, Eye, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useAuth } from "../../store/AuthContext";
import { useHierarchy } from "../../store/HierarchyStore";
import { useCan } from "../../store/RbacContext";
import { useConfirm } from "../../store/ConfirmContext";
import { useLocale } from "../../store/LocaleContext";
import type { WorkEntityType } from "../../models/domain";

export function WorkCommentsBlock({
  projectId,
  entityType,
  entityId,
}: {
  projectId: string;
  entityType: Exclude<WorkEntityType, "project">;
  entityId: string;
}) {
  const { t } = useLocale();
  const { workComments, addWorkComment, removeWorkComment } = useHierarchy();
  const { user, users } = useAuth();
  const can = useCan();
  const confirm = useConfirm();
  const canManage = can.manageRecords(user?.role);
  const [text, setText] = useState("");
  const rows = workComments
    .filter(
      (c) =>
        c.projectId === projectId &&
        c.entityType === entityType &&
        c.entityId === entityId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-extrabold text-steel-600">
        {t("workComments.sectionTitle")}
      </h4>
      {rows.length === 0 ? (
        <p className="text-[11px] text-steel-400">{t("workComments.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => {
            const author =
              users.find((u) => u.id === c.authorUserId)?.name ?? "—";
            return (
              <li
                key={c.id}
                className="rounded border border-steel-200 px-3 py-2 dark:border-steel-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-steel-500">
                      {author}
                      <span className="mx-1.5 text-steel-300">·</span>
                      <span className="tabular-nums font-normal">
                        {c.createdAt.slice(0, 10)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-steel-700 dark:text-steel-200">
                      {c.text}
                    </p>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-steel-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={t("workComments.deleteAria")}
                      onClick={async () => {
                        const ok = await confirm({
                          title: t("common.confirmDeleteTitle"),
                          message: t("workComments.deleteMessage"),
                          danger: true,
                          confirmLabel: t("common.delete"),
                        });
                        if (ok) removeWorkComment(c.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {canManage && user ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label={t("workComments.newComment")}
            className="min-w-[12rem] flex-1"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("workComments.placeholder")}
            />
          </Field>
          <Button
            size="sm"
            disabled={!text.trim()}
            onClick={() => {
              addWorkComment({
                projectId,
                entityType,
                entityId,
                authorUserId: user.id,
                text: text.trim(),
              });
              setText("");
            }}
          >
            {t("common.add")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function WorkAttachmentsBlock({
  projectId,
  entityType,
  entityId,
}: {
  projectId: string;
  entityType: WorkEntityType;
  entityId: string;
}) {
  const { t } = useLocale();
  const { workAttachments, addWorkAttachment, removeWorkAttachment } =
    useHierarchy();
  const { user, users } = useAuth();
  const can = useCan();
  const confirm = useConfirm();
  const canManage = can.manageRecords(user?.role);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    name: string;
    mimeType: string;
    url: string;
  } | null>(null);

  const rows = workAttachments
    .filter(
      (a) =>
        a.projectId === projectId &&
        a.entityType === entityType &&
        a.entityId === entityId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  const closePreview = () => {
    setPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const loadBlob = async (id: string) => {
    const { getAttachmentBlob } = await import("../../lib/attachmentFiles");
    return getAttachmentBlob(id);
  };

  const onUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !user) return;
    setError("");
    setUploading(true);
    try {
      await addWorkAttachment({
        projectId,
        entityType,
        entityId,
        uploadedByUserId: user.id,
        file,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("workAttachments.uploadFailed"),
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onView = async (a: (typeof rows)[number]) => {
    setError("");
    setBusyId(a.id);
    try {
      const blob = await loadBlob(a.id);
      if (!blob) {
        setError(t("workAttachments.fileUnavailable"));
        return;
      }
      const {
        canPreviewMime,
        downloadBlob,
      } = await import("../../lib/attachmentFiles");
      const mime = a.mimeType || blob.type || "application/octet-stream";
      if (!canPreviewMime(mime)) {
        downloadBlob(blob, a.name);
        return;
      }
      closePreview();
      const url = URL.createObjectURL(blob);
      setPreview({ name: a.name, mimeType: mime, url });
    } catch {
      setError(t("workAttachments.previewFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const onDownload = async (a: (typeof rows)[number]) => {
    setError("");
    setBusyId(a.id);
    try {
      const blob = await loadBlob(a.id);
      if (!blob) {
        setError(t("workAttachments.fileUnavailable"));
        return;
      }
      const { downloadBlob } = await import("../../lib/attachmentFiles");
      downloadBlob(blob, a.name);
    } catch {
      setError(t("workAttachments.downloadFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-extrabold text-steel-600">
          {t("workAttachments.sectionTitle")}
        </h4>
        {canManage && user ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              onChange={(e) => void onUpload(e.target.files)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading
                ? t("workAttachments.uploading")
                : t("workAttachments.upload")}
            </Button>
          </>
        ) : null}
      </div>
      <p className="text-[11px] text-steel-400">{t("workAttachments.hint")}</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-[11px] text-steel-400">{t("workAttachments.empty")}</p>
      ) : (
        <ul className="divide-y divide-steel-100 dark:divide-steel-800">
          {rows.map((a) => {
            const by =
              users.find((u) => u.id === a.uploadedByUserId)?.name ?? "—";
            const busy = busyId === a.id;
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-steel-400" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.name}</p>
                    <p className="text-[11px] text-steel-400">
                      {a.sizeLabel}
                      <span className="mx-1.5 text-steel-300">·</span>
                      {by}
                      <span className="mx-1.5 text-steel-300">·</span>
                      <span className="tabular-nums">
                        {a.createdAt.slice(0, 10)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="inline-flex flex-nowrap items-center gap-0.5">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-brand-500/10 hover:text-brand-600 disabled:opacity-40"
                    aria-label={t("common.view")}
                    title={t("common.view")}
                    disabled={busy}
                    onClick={() => void onView(a)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-brand-500/10 hover:text-brand-600 disabled:opacity-40"
                    aria-label={t("workAttachments.download")}
                    title={t("workAttachments.download")}
                    disabled={busy}
                    onClick={() => void onDownload(a)}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {canManage ? (
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-steel-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={t("workAttachments.deleteAria")}
                      title={t("common.delete")}
                      onClick={async () => {
                        const ok = await confirm({
                          title: t("common.confirmDeleteTitle"),
                          message: t("workAttachments.deleteMessage"),
                          danger: true,
                          confirmLabel: t("common.delete"),
                        });
                        if (ok) removeWorkAttachment(a.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(preview)}
        onClose={closePreview}
        title={
          preview
            ? t("workAttachments.previewTitle", { name: preview.name })
            : t("workAttachments.previewDefaultTitle")
        }
        size="xl"
        footer={
          <Button variant="outline" onClick={closePreview}>
            {t("common.close")}
          </Button>
        }
      >
        {preview ? (
          preview.mimeType.startsWith("image/") ? (
            <img
              src={preview.url}
              alt={preview.name}
              className="mx-auto max-h-[65vh] w-auto max-w-full rounded border border-steel-200 object-contain dark:border-steel-700"
            />
          ) : preview.mimeType.startsWith("text/") ? (
            <iframe
              title={preview.name}
              src={preview.url}
              className="h-[65vh] w-full rounded border border-steel-200 bg-white dark:border-steel-700"
            />
          ) : (
            <iframe
              title={preview.name}
              src={preview.url}
              className="h-[65vh] w-full rounded border border-steel-200 bg-white dark:border-steel-700"
            />
          )
        ) : null}
      </Modal>
    </div>
  );
}
