import { useEffect, useRef } from "react";
import {
  collectRecordAttachments,
  extractAttachmentSearchTextFromDataUrl,
  patchAttachmentInRecord,
} from "../lib/attachmentSearch";
import { effectiveStatus } from "../lib/status";
import type { RecordItem } from "../lib/types";

export function useArchiveAttachmentIndexing(
  records: RecordItem[],
  updateRecord: (
    id: string,
    patch: (record: RecordItem) => Partial<RecordItem>,
  ) => void,
) {
  const indexedRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    const jobs = records.flatMap((record) => {
      if (effectiveStatus(record) !== "closed") return [];
      return collectRecordAttachments(record)
        .filter(
          (attachment) =>
            attachment.dataUrl &&
            attachment.mimeType &&
            !attachment.searchText,
        )
        .map((attachment) => ({
          key: `${record.id}:${attachment.id}`,
          recordId: record.id,
          attachmentId: attachment.id,
          dataUrl: attachment.dataUrl!,
          mimeType: attachment.mimeType!,
        }));
    });

    (async () => {
      for (const job of jobs) {
        if (cancelled || indexedRef.current.has(job.key)) continue;
        indexedRef.current.add(job.key);

        try {
          const searchText = await extractAttachmentSearchTextFromDataUrl(
            job.dataUrl,
            job.mimeType,
          );
          if (cancelled || !searchText.trim()) continue;

          updateRecord(job.recordId, (record) =>
            patchAttachmentInRecord(record, job.attachmentId, {
              searchText: searchText.slice(0, 120_000),
            }),
          );
        } catch {
          indexedRef.current.delete(job.key);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [records, updateRecord]);
}
