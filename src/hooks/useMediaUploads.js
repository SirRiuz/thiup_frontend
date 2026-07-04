// SEQUENTIAL upload queue (one file at a time), robust to hot add/cancel.
//
// Each file is presigned + PUT to R2 the moment its turn comes; the thread
// relation is created later via confirmAll() when the user posts.
//
// Robustness rules (the previous parallel version hung when files were
// added/cancelled mid-flight):
//   - The queue's source of truth is `uploadsRef`, updated SYNCHRONOUSLY (not
//     only via a deferred setState updater), so the "start next" logic always
//     reads the CURRENT queue — files added while running are seen immediately.
//   - "Is something uploading?" is a synchronous `activeRef`, ALWAYS cleared in
//     a finally (success / error / abort) → it can never get stuck.
//   - Every finalization calls pump() → the next "queued" item starts; nothing
//     is ever left stranded.
//   - Cancel aborts the in-flight request (AbortController) AND advances.
//
// Per-file state: queued → uploading → uploaded → (confirmed at Send) | error |
// canceled. start() is idempotent per id; retry() re-queues WITHOUT reprocessing
// (reuses the already-compressed Blob).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  presignAndUpload,
  confirmThreadFile,
} from "../api/threadFileApi";

// upload item: { id, name, status: "queued"|"uploading"|"uploaded"|"error"|"canceled",
//                progress: 0..100, presign: object|null, error: Error|null }
export default function useMediaUploads() {
  const [uploads, setUploads] = useState([]);

  // Synchronous mirror of `uploads` — the queue logic reads THIS (never a stale
  // render closure), so hot add/cancel is always reflected.
  const uploadsRef = useRef([]);
  const startedRef = useRef(new Set()); // ids ever started (idempotency)
  const paramsRef = useRef(new Map()); // id -> upload/confirm params
  const abortRef = useRef(new Map()); // id -> AbortController (while uploading)
  const activeRef = useRef(null); // id currently uploading, or null
  const runRef = useRef(null); // holds run() so pump/run can recurse

  // Single mutation path: update the ref SYNCHRONOUSLY, then setState with the
  // concrete next value. Keeps uploadsRef authoritative for pump() called right
  // after, and consistent when several mutations land in the same tick.
  const mutate = useCallback((updater) => {
    const next = updater(uploadsRef.current);
    uploadsRef.current = next;
    setUploads(next);
  }, []);

  const patch = useCallback(
    (id, fields) =>
      mutate((prev) => prev.map((u) => (u.id === id ? { ...u, ...fields } : u))),
    [mutate]
  );

  // Idempotent "start the next queued item if nothing is uploading". Driven from
  // start(), retry(), remove() and every run() finally → there is always a
  // trigger after any state change, so the queue can never stall.
  const pump = useCallback(() => {
    if (activeRef.current != null) return; // one at a time
    const next = uploadsRef.current.find((u) => u.status === "queued");
    if (next && runRef.current) runRef.current(next.id);
  }, []);

  // run() is reassigned each render (closures over latest helpers) but always
  // stored in a ref so pump() calls the current one.
  runRef.current = async (id) => {
    const params = paramsRef.current.get(id);
    if (!params) {
      activeRef.current = null;
      pump();
      return;
    }
    activeRef.current = id;
    const controller = new AbortController();
    abortRef.current.set(id, controller);
    patch(id, { status: "uploading", progress: 0, error: null });
    try {
      const presign = await presignAndUpload({
        file: params.file,
        contentType: params.contentType,
        isVideo: params.isVideo,
        filenameOriginal: params.filenameOriginal,
        onProgress: (p) => patch(id, { progress: p }),
        signal: controller.signal,
      });
      patch(id, { status: "uploaded", progress: 100, presign });
    } catch (err) {
      if (controller.signal.aborted) {
        // Cancelled: the item is usually already removed; if still present,
        // mark it canceled (a no-op map when it's gone).
        patch(id, { status: "canceled" });
      } else {
        patch(id, { status: "error", error: err });
      }
    } finally {
      abortRef.current.delete(id);
      activeRef.current = null; // ALWAYS released → never stuck
      pump(); // advance to the next queued item (success/error/cancel alike)
    }
  };

  // Enqueue a file. `params` carries everything needed to upload now and to
  // confirm later. Idempotent per id.
  const start = useCallback(
    (id, name, params) => {
      if (startedRef.current.has(id)) return;
      startedRef.current.add(id);
      paramsRef.current.set(id, params);
      mutate((prev) =>
        prev.some((u) => u.id === id)
          ? prev
          : [
              ...prev,
              { id, name, status: "queued", progress: 0, presign: null, error: null },
            ]
      );
      pump();
    },
    [mutate, pump]
  );

  // Re-queue a failed upload reusing the stored (already-compressed) Blob.
  const retry = useCallback(
    (id) => {
      if (!paramsRef.current.has(id)) return;
      patch(id, { status: "queued", progress: 0, error: null });
      pump();
    },
    [patch, pump]
  );

  // Cancel/remove a file. Aborts the in-flight request if this one is uploading
  // (its run() finally then advances the queue); removes it either way. pump()
  // covers the case where a QUEUED item was removed while another is idle.
  const remove = useCallback(
    (id) => {
      const controller = abortRef.current.get(id);
      if (controller) controller.abort();
      startedRef.current.delete(id);
      paramsRef.current.delete(id);
      abortRef.current.delete(id);
      mutate((prev) => prev.filter((u) => u.id !== id));
      pump();
    },
    [mutate, pump]
  );

  const clear = useCallback(() => {
    abortRef.current.forEach((c) => c.abort());
    abortRef.current.clear();
    startedRef.current.clear();
    paramsRef.current.clear();
    activeRef.current = null;
    uploadsRef.current = [];
    setUploads([]);
  }, []);

  // At Send: attach every uploaded object to the thread. Best-effort per file.
  // Returns the confirmed media already mapped to the shape ThreadMedia consumes
  // ({ id, type, url, isNsfw }) so the caller can inject it into the just-created
  // thread optimistically (media visible without a reload). Only successfully
  // confirmed files are included — a failed one is skipped (no broken media).
  //
  // SERVER-SIDE NSFW CLASSIFICATION HOOKS IN HERE (future): the file is already
  // in R2 (after the upload above) but not yet attached. A server-side service
  // would classify the object between the R2 upload and this confirm, stamping
  // is_nsfw + score into the file's metadata. The frontend stays agnostic: it
  // sends no client verdict (isNsfw:false) and the server is the source of
  // truth. Plugging it in needs no FE rewrite.
  const confirmAll = useCallback(async (threadUid) => {
    const ready = uploadsRef.current.filter(
      (u) => u.status === "uploaded" && u.presign
    );
    const media = [];
    for (const upload of ready) {
      const params = paramsRef.current.get(upload.id) || {};
      const report = params.report || {};
      try {
        // eslint-disable-next-line no-await-in-loop
        const record = await confirmThreadFile({
          uid: upload.presign.uid,
          thread: threadUid,
          isVideo: params.isVideo || false,
          width: report.width || 0,
          height: report.height || 0,
          targetColor: report.dominantColor || "161c1e",
          isNsfw: false, // client never classifies; server is source of truth
          metadata: params.metadata || {},
        });
        media.push({
          id: record.uid,
          type: record.is_video ? "video" : "image",
          url: record.public_url,
          isNsfw: !!record.is_nsfw,
          // Real dimensions (image report / video probe) so the optimistic
          // just-posted media renders at its final aspect-ratio — no jump.
          width: report.width || 0,
          height: report.height || 0,
          dominantColor: report.dominantColor || null,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Thread file confirm failed:", upload.name, err);
      }
    }
    return media;
  }, []);

  // Abort any in-flight upload on unmount (no orphaned requests).
  useEffect(
    () => () => {
      abortRef.current.forEach((c) => c.abort());
      abortRef.current.clear();
    },
    []
  );

  // Busy while anything is queued or uploading — gates Send until the queue
  // drains. Derived from state (no separate flag to get out of sync).
  const pending = useMemo(
    () =>
      uploads.some((u) => u.status === "queued" || u.status === "uploading"),
    [uploads]
  );

  return { uploads, start, retry, confirmAll, remove, clear, pending };
}
