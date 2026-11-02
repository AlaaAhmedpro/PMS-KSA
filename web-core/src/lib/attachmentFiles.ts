/** IndexedDB blob store for demo attachment files (upload / view / download). */

const DB_NAME = "pms_core_attachment_files_v1";
const STORE = "files";
const DB_VERSION = 1;

/** Soft cap for browser demo storage */
export const ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;

const PREVIEWABLE = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "text/plain",
]);

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

export async function putAttachmentBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).put(blob, id));
  } finally {
    db.close();
  }
}

export async function getAttachmentBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const value = await idbReq(tx.objectStore(STORE).get(id));
    return value instanceof Blob ? value : null;
  } finally {
    db.close();
  }
}

export async function deleteAttachmentBlob(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}

export async function clearAllAttachmentBlobs(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).clear());
  } finally {
    db.close();
  }
}

export function formatSizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} ب`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} ك.ب`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function guessMimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".docx") || lower.endsWith(".doc"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".dwg")) return "application/acad";
  return "application/octet-stream";
}

export function canPreviewMime(mimeType: string): boolean {
  if (PREVIEWABLE.has(mimeType)) return true;
  return mimeType.startsWith("image/") || mimeType.startsWith("text/");
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function seedDemoAttachmentBlob(
  id: string,
  name: string,
  mimeType: string,
): Blob {
  const stamp = new Date().toISOString().slice(0, 10);
  const body = [
    "نظام إدارة المشاريع — مرفق تجريبي",
    `المعرّف: ${id}`,
    `الاسم: ${name}`,
    `النوع: ${mimeType}`,
    `التاريخ: ${stamp}`,
    "",
    "هذا الملف مُنشأ محلياً لأغراض العرض والتجربة.",
  ].join("\n");

  if (mimeType.startsWith("image/")) {
    /* Minimal 1×1 PNG */
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      ),
      (c) => c.charCodeAt(0),
    );
    return new Blob([png], { type: "image/png" });
  }

  if (mimeType === "application/pdf") {
    /* Minimal valid single-page PDF with text note */
    const content = `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 68 >>stream
BT /F1 12 Tf 72 720 Td (${name.replace(/[()\\]/g, "")}) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000384 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
461
%%EOF`;
    return new Blob([content], { type: "application/pdf" });
  }

  return new Blob([body], {
    type: mimeType.startsWith("text/") ? mimeType : "text/plain",
  });
}

export async function ensureSeedAttachmentBlobs(
  items: { id: string; name: string; mimeType: string }[],
): Promise<void> {
  for (const item of items) {
    const existing = await getAttachmentBlob(item.id);
    if (existing) continue;
    const blob = seedDemoAttachmentBlob(item.id, item.name, item.mimeType);
    await putAttachmentBlob(item.id, blob);
  }
}
