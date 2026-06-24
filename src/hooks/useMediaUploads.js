// Auto-uploads each processed file to R2 (presign → PUT with progress) the
// moment it's started, independently of the Send button. The thread relation is
// created later via confirmAll() when the user posts.
//
// Per-file state machine: uploading → uploaded → (confirmed at Send) / error.
// start() is idempotent per id (never uploads the same file twice); retry()
// re-runs WITHOUT reprocessing (reuses the already-compressed Blob).

import { useCallback, useMemo, useRef, useState } from "react";
import {
  presignAndUpload,
  confirmThreadFile,
} from "../api/threadFileApi";

// upload item: { id, name, status: "uploading"|"uploaded"|"error",
//                progress: 0..100, presign: object|null, error: Error|null }
export default function useMediaUploads() {
  const [uploads, setUploads] = useState([]);
  // ids that have ever been started (idempotency guard).
  const startedRef = useRef(new Set());
  // id -> params needed to upload/retry/confirm without reprocessing.
  const paramsRef = useRef(new Map());

  const patch = useCallback((id, fields) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...fields } : u))
    );
  }, []);

  const run = useCallback(
    async (id) => {
      const params = paramsRef.current.get(id);
      if (!params) return;
      patch(id, { status: "uploading", progress: 0, error: null });
      try {
        const presign = await presignAndUpload({
          file: params.file,
          contentType: params.contentType,
          isVideo: params.isVideo,
          filenameOriginal: params.filenameOriginal,
          onProgress: (p) => patch(id, { progress: p }),
        });
        patch(id, { status: "uploaded", progress: 100, presign });
      } catch (err) {
        patch(id, { status: "error", error: err });
      }
    },
    [patch]
  );

  // Idempotent: starts the upload for `id` once. `params` carries everything
  // needed to upload now and to confirm later.
  const start = useCallback(
    (id, name, params) => {
      if (startedRef.current.has(id)) return;
      startedRef.current.add(id);
      paramsRef.current.set(id, params);
      setUploads((prev) =>
        prev.some((u) => u.id === id)
          ? prev
          : [
              ...prev,
              { id, name, status: "uploading", progress: 0, presign: null, error: null },
            ]
      );
      run(id);
    },
    [run]
  );

  // Re-run a failed upload reusing the stored (already-compressed) Blob.
  const retry = useCallback(
    (id) => {
      if (paramsRef.current.has(id)) run(id);
    },
    [run]
  );

  // At Send: attach every uploaded object to the thread. Best-effort per file.
  // Returns the confirmed media already mapped to the shape ThreadMedia consumes
  // ({ id, type, url, isNsfw }) so the caller can inject it into the just-created
  // thread optimistically (media visible without a reload). Only successfully
  // confirmed files are included — a failed one is skipped (no broken media).
  const confirmAll = useCallback(
    async (threadUid) => {
      const ready = uploads.filter((u) => u.status === "uploaded" && u.presign);
      const media = [];
      for (const upload of ready) {
        const params = paramsRef.current.get(upload.id) || {};
        const report = params.report || {};
        const verdict = params.verdict;
        try {
          // eslint-disable-next-line no-await-in-loop
          const record = await confirmThreadFile({
            uid: upload.presign.uid,
            thread: threadUid,
            isVideo: params.isVideo || false,
            width: report.width || 0,
            height: report.height || 0,
            targetColor: report.dominantColor || "161c1e",
            isNsfw: verdict ? verdict.verdict !== "safe" : false,
            metadata: params.metadata || {},
          });
          media.push({
            id: record.uid,
            type: record.is_video ? "video" : "image",
            url: record.public_url,
            isNsfw: !!record.is_nsfw,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Thread file confirm failed:", upload.name, err);
        }
      }
      return media;
    },
    [uploads]
  );

  const remove = useCallback((id) => {
    startedRef.current.delete(id);
    paramsRef.current.delete(id);
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const clear = useCallback(() => {
    startedRef.current.clear();
    paramsRef.current.clear();
    setUploads([]);
  }, []);

  // Any upload still in flight — used to gate Send until uploads settle.
  const pending = useMemo(
    () => uploads.some((u) => u.status === "uploading"),
    [uploads]
  );

  return { uploads, start, retry, confirmAll, remove, clear, pending };
}
