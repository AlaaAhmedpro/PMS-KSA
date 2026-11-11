import { useEffect, useRef, useState } from "react";
import { FileText, Trash2, UploadCloud, Eye, Loader2, ImageIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  extractAttachmentSearchText,
  isSearchableAttachmentMime,
  SEARCHABLE_ATTACHMENT_ACCEPT,
} from "../../lib/attachmentSearch";
import { fileSize } from "../../lib/format";
import type { Attachment } from "../../lib/types";
import { Modal } from "./Modal";
import { useLocale } from "../../store/LocaleContext";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isImageAttachment(attachment: Attachment): boolean {
  return (
    attachment.mimeType?.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|bmp)$/i.test(attachment.name)
  );
}

export function FileUpload({
  attachments,
  onChange,
  compact = false,
}: {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef(attachments);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [indexingIds, setIndexingIds] = useState<string[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const patchAttachment = (id: string, patch: Partial<Attachment>) => {
    onChange(
      attachmentsRef.current.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  };

  const indexAttachment = async (attachmentId: string, file: File) => {
    setIndexingIds((prev) => [...prev, attachmentId]);
    try {
      const searchText = await extractAttachmentSearchText(file);
      if (searchText.trim()) {
        patchAttachment(attachmentId, {
          searchText: searchText.slice(0, 120_000),
        });
      }
    } catch {
      /* ignore extraction errors in demo */
    } finally {
      setIndexingIds((prev) => prev.filter((id) => id !== attachmentId));
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const accepted = Array.from(files).filter((file) =>
      isSearchableAttachmentMime(file.type),
    );
    if (!accepted.length) return;

    for (const file of accepted) {
      const dataUrl = await readFileAsDataUrl(file);
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        dataUrl,
        mimeType: file.type,
      };

      onChange([...attachmentsRef.current, attachment]);
      void indexAttachment(attachment.id, file);
    }
  };

  const indexing = new Set(indexingIds);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors",
          compact ? "py-4" : "py-8",
          dragging
            ? "border-brand-500 bg-brand-500/5"
            : "border-steel-300 hover:border-brand-500/50 hover:bg-steel-50 dark:border-steel-700 dark:hover:bg-steel-800/40",
        )}
      >
        <UploadCloud className={cn("text-brand-500", compact ? "h-6 w-6" : "h-8 w-8")} />
        <p className="text-sm font-semibold text-steel-700 dark:text-steel-200">
          {compact
            ? t("ui.fileUpload.compactHint")
            : t("ui.fileUpload.dropHint")}
        </p>
        {!compact && (
          <p className="text-xs text-steel-400">{t("ui.fileUpload.indexHelp")}</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={SEARCHABLE_ATTACHMENT_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-steel-200 bg-white p-3 dark:border-steel-700 dark:bg-steel-900"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  isImageAttachment(a)
                    ? "bg-sky-500/10 text-sky-500"
                    : "bg-red-500/10 text-red-500",
                )}
              >
                {isImageAttachment(a) ? (
                  <ImageIcon className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-steel-700 dark:text-steel-200">
                  {a.name}
                </p>
                <p className="text-xs text-steel-400">
                  {fileSize(a.size)}
                  {indexing.has(a.id) && ` · ${t("ui.fileUpload.indexing")}`}
                  {!indexing.has(a.id) && a.searchText && ` · ${t("ui.fileUpload.indexed")}`}
                </p>
              </div>
              {indexing.has(a.id) ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
              ) : (
                a.dataUrl && (
                  <button
                    type="button"
                    onClick={() => setPreview(a)}
                    className="rounded-lg p-2 text-steel-400 hover:bg-steel-100 hover:text-brand-600 dark:hover:bg-steel-800"
                    title={t("ui.fileUpload.view")}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}
                className="rounded-lg p-2 text-steel-400 hover:bg-red-500/10 hover:text-red-500"
                title={t("common.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name}
        size="lg"
      >
        {preview?.dataUrl ? (
          isImageAttachment(preview) ? (
            <img
              src={preview.dataUrl}
              alt={preview.name}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          ) : (
            <iframe
              src={preview.dataUrl}
              title={preview.name}
              className="h-[70vh] w-full rounded-lg border border-steel-200 dark:border-steel-700"
            />
          )
        ) : (
          <p className="py-8 text-center text-sm text-steel-400">
            {t("ui.fileUpload.cannotPreview")}
          </p>
        )}
      </Modal>
    </div>
  );
}
