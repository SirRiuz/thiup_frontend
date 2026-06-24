// Shared media-attach orchestration for BOTH composers (new thread + reply):
// validate → NSFW scan + compress (images) → auto-upload as each file finishes
// → confirm against the thread at submit. Keeps the two composers DRY; each only
// renders its own button/input and the <MediaScanList>.
//
// - Images: scanned + compressed to WebP (metadata stripped), the COMPRESSED
//   file is uploaded.
// - Videos: scanned, the ORIGINAL file is uploaded (no compression).

import { useCallback, useEffect, useMemo, useRef } from "react";
import useNsfwScan from "./useNsfwScan";
import useImageCompression from "./useImageCompression";
import useMediaUploads from "./useMediaUploads";
import {
  logProcessed,
  buildProcessedMetadata,
} from "../services/imageCompression/imageCompressor";
import { isVideoFile } from "../services/nsfw/nsfwAnalyzer";
import { isAllowedFile } from "../services/media/allowedFormats";

export const MAX_FILES = 10;

// Per-type size limits (FE gives precise, friendly feedback BEFORE uploading;
// the backend keeps a general 512 MB hard cap as the real guard).
const IMAGE_MAX_BYTES = 8 * 1024 * 1024; // JPG/PNG/WEBP
const GIF_MAX_BYTES = 15 * 1024 * 1024; // animated GIF (image/gif)
const VIDEO_MAX_BYTES = 512 * 1024 * 1024; // video

// Returns the i18n key for the too-large message by type, or null if it fits.
// image/gif gets the larger cap; other images the smaller one.
function sizeErrorKey(file) {
  if (isVideoFile(file)) {
    return file.size > VIDEO_MAX_BYTES ? "post.videoTooLarge" : null;
  }
  if (file.type === "image/gif") {
    return file.size > GIF_MAX_BYTES ? "post.gifTooLarge" : null;
  }
  return file.size > IMAGE_MAX_BYTES ? "post.imageTooLarge" : null;
}

// Resolve the Content-Type to sign for a video (some .mov arrive with an empty
// MIME). The backend accepts video/mp4 and video/quicktime.
function videoContentType(file) {
  if (file.type) return file.type;
  return /\.mov$/i.test(file.name || "") ? "video/quicktime" : "video/mp4";
}

const pct = (v) => `${Math.round((v || 0) * 100)}%`;

// Minimal config metadata for a video (no compression report). Uses the same
// whitelisted keys as images so the backend stores it consistently.
function videoMetadata(item) {
  const v = item.result;
  if (!v) return { archivo: item.name };
  const labels = { safe: "Seguro", review: "Revisar", block: "Bloquear" };
  return {
    archivo: item.name,
    prediccion: labels[v.verdict] || v.verdict,
    esNsfw: v.verdict === "safe" ? "no" : "sí",
    nsfwPorcentaje: pct(v.score),
    explicito: pct(v.explicit),
    sugerente: pct(v.sexy),
  };
}

export default function useMediaComposer() {
  const scan = useNsfwScan();
  const compression = useImageCompression();
  const {
    uploads: uploadItems,
    start: startUpload,
    retry: retryUpload,
    confirmAll,
    remove: removeUpload,
    clear: clearUploads,
    pending: uploadsPending,
  } = useMediaUploads();

  const compressionByFile = useMemo(() => {
    const map = new Map();
    compression.results.forEach((r) => {
      if (r.sourceFile) map.set(r.sourceFile, r);
    });
    return map;
  }, [compression.results]);

  const uploadsById = useMemo(() => {
    const map = new Map();
    uploadItems.forEach((u) => map.set(u.id, u));
    return map;
  }, [uploadItems]);

  // When a file finishes processing, log it once and auto-start its upload:
  // images upload the compressed WebP (after compression); videos upload the
  // original. startUpload is idempotent per id.
  const loggedRef = useRef(new Set());
  useEffect(() => {
    scan.items.forEach((item) => {
      if (item.status !== "done" || !item.result) return;

      if (item.kind === "image") {
        const comp = compressionByFile.get(item.file);
        if (!comp || comp.status !== "done" || !comp.report || !comp.file) return;
        if (!loggedRef.current.has(item.id)) {
          loggedRef.current.add(item.id);
          logProcessed(comp.report, item.result);
        }
        startUpload(item.id, comp.report.name, {
          file: comp.file,
          contentType: comp.file.type || "image/webp",
          isVideo: false,
          report: comp.report,
          verdict: item.result,
          metadata: buildProcessedMetadata(comp.report, item.result),
          filenameOriginal: comp.report.name,
        });
      } else if (item.kind === "video") {
        startUpload(item.id, item.name, {
          file: item.file,
          contentType: videoContentType(item.file),
          isVideo: true,
          report: null,
          verdict: item.result,
          metadata: videoMetadata(item),
          filenameOriginal: item.name,
        });
      }
    });
    if (scan.items.length === 0 && compression.results.length === 0) {
      loggedRef.current.clear();
    }
  }, [scan.items, compression.results, compressionByFile, startUpload]);

  // Validate the selection (size / type / count) and start processing accepted
  // files. Returns { error: { key, params } | null } so the caller translates it.
  const addFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return { error: null };
      const availableSlots = MAX_FILES - scan.items.length;
      if (availableSlots <= 0) {
        return { error: { key: "post.maxFiles", params: { max: MAX_FILES } } };
      }
      const accepted = [];
      const rejectedNames = []; // wrong format → skipped, with a clear notice
      let sizeError = null;
      files.slice(0, availableSlots).forEach((file) => {
        // Strict format whitelist (PNG/JPG/JPEG, MP4/MOV) — never trust `accept`.
        if (!isAllowedFile(file)) {
          rejectedNames.push(file.name || "?");
          return;
        }
        const tooLargeKey = sizeErrorKey(file);
        if (tooLargeKey) {
          if (!sizeError) sizeError = { key: tooLargeKey, params: {} };
          return;
        }
        accepted.push(file);
      });
      // Surface the format rejection first (the confusing case, e.g. HEIC),
      // then size, then the count cap.
      let error = null;
      if (rejectedNames.length > 0) {
        error = {
          key: "post.formatRejected",
          params: { names: rejectedNames.join(", ") },
        };
      } else if (sizeError) {
        error = sizeError;
      } else if (files.length > availableSlots) {
        error = { key: "post.maxFiles", params: { max: MAX_FILES } };
      }
      if (accepted.length > 0) {
        scan.addFiles(accepted);
        // compression.compress filters to images internally; videos are skipped.
        compression.compress(accepted);
      }
      return { error };
    },
    [scan, compression]
  );

  const removeItem = useCallback(
    (id) => {
      scan.removeItem(id);
      removeUpload(id);
    },
    [scan, removeUpload]
  );

  // Attach every uploaded object to the thread (called at submit, once the
  // thread exists). Best-effort per file.
  const confirmTo = useCallback(
    (threadUid) => confirmAll(threadUid),
    [confirmAll]
  );

  const clear = useCallback(() => {
    scan.clear();
    compression.clear();
    clearUploads();
    loggedRef.current.clear();
  }, [scan, compression, clearUploads]);

  const isCompressing = compression.results.some(
    (r) => r.status === "queued" || r.status === "compressing"
  );

  return {
    items: scan.items,
    compressionByFile,
    uploadsById,
    // Counter of files still being analyzed (NSFW), for the list header.
    analyzingCount: scan.pending,
    // Busy = still analyzing, compressing or uploading → block submit so we
    // never post a thread that references an incomplete upload.
    pending: scan.pending > 0 || isCompressing || uploadsPending,
    count: scan.items.length,
    attachDisabled: scan.items.length >= MAX_FILES,
    addFiles,
    removeItem,
    retryUpload,
    confirmTo,
    clear,
  };
}
