import type { Attachment, RecordItem } from "./types";

/** توحيد النص للبحث — عربي/إنجليزي */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearchQuery(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(haystack).includes(normalizedQuery);
}

export function collectRecordAttachments(record: RecordItem): Attachment[] {
  return [
    ...record.attachments,
    ...(record.actions?.flatMap((action) => action.attachments) ?? []),
  ];
}

export function recordHasAttachmentMatch(record: RecordItem, query: string): boolean {
  return collectRecordAttachments(record).some((attachment) =>
    attachmentMatchesQuery(attachment, query),
  );
}

export function attachmentMatchesQuery(attachment: Attachment, query: string): boolean {
  if (matchesSearchQuery(attachment.name, query)) return true;
  if (attachment.searchText && matchesSearchQuery(attachment.searchText, query)) {
    return true;
  }
  return false;
}

export function recordMatchesArchiveSearch(
  record: RecordItem,
  query: string,
  entityName = "",
): boolean {
  const q = query.trim();
  if (!q) return true;

  const baseFields = [
    record.regNumber,
    record.subject,
    entityName,
    record.outNumber,
    record.notes,
  ];

  if (baseFields.some((field) => matchesSearchQuery(field, query))) return true;
  return recordHasAttachmentMatch(record, query);
}

export function buildDemoAttachmentSearchText(
  fileName: string,
  subject: string,
  notes?: string,
): string {
  return normalizeSearchText(`${fileName} ${subject} ${notes ?? ""}`);
}

export function enrichRecordAttachmentSearch(record: RecordItem): RecordItem {
  const enrich = (attachment: Attachment, context: string) => {
    if (attachment.searchText || attachment.dataUrl) return attachment;
    return {
      ...attachment,
      searchText: buildDemoAttachmentSearchText(
        attachment.name,
        record.subject,
        context,
      ),
    };
  };

  return {
    ...record,
    attachments: record.attachments.map((attachment) =>
      enrich(attachment, record.notes),
    ),
    actions: record.actions?.map((action) => ({
      ...action,
      attachments: action.attachments.map((attachment) =>
        enrich(attachment, action.text),
      ),
    })),
  };
}

export function patchAttachmentInRecord(
  record: RecordItem,
  attachmentId: string,
  patch: Partial<Attachment>,
): Partial<RecordItem> {
  if (record.attachments.some((attachment) => attachment.id === attachmentId)) {
    return {
      attachments: record.attachments.map((attachment) =>
        attachment.id === attachmentId ? { ...attachment, ...patch } : attachment,
      ),
    };
  }

  if (!record.actions?.length) return {};

  return {
    actions: record.actions.map((action) => ({
      ...action,
      attachments: action.attachments.map((attachment) =>
        attachment.id === attachmentId ? { ...attachment, ...patch } : attachment,
      ),
    })),
  };
}

let pdfModulePromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfJs() {
  if (!pdfModulePromise) {
    pdfModulePromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }
  return pdfModulePromise;
}

async function extractPdfTextFromBuffer(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await getPdfJs();
  const pdf = await pdfjs.getDocument({ data: buffer.slice(0) }).promise;
  const chunks: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    chunks.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" "),
    );
  }

  return chunks.join("\n");
}

async function extractImageText(source: File | string): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ara+eng", 1, {
    logger: () => {},
  });

  try {
    const { data } = await worker.recognize(source);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function extractAttachmentSearchText(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    const buffer = await file.arrayBuffer();
    return extractPdfTextFromBuffer(buffer);
  }

  if (file.type.startsWith("image/")) {
    return extractImageText(file);
  }

  return "";
}

export async function extractAttachmentSearchTextFromDataUrl(
  dataUrl: string,
  mimeType: string,
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractPdfTextFromBuffer(dataUrlToArrayBuffer(dataUrl));
  }

  if (mimeType.startsWith("image/")) {
    return extractImageText(dataUrl);
  }

  return "";
}

export function isSearchableAttachmentMime(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export const SEARCHABLE_ATTACHMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp";
