// Shared media-attach orchestration for BOTH composers (new thread + reply):
// validate → compress (images only) → auto-upload as each file is ready →
// confirm against the thread at submit. Keeps the two composers DRY; each only
// renders its own button/input and the <MediaScanList>.
//
// - Images: compressed to WebP (downscaled + metadata stripped), the COMPRESSED
//   file is uploaded.
// - Videos: the ORIGINAL file is uploaded as-is (no client compression).
//
// NO client-side NSFW classification: the model crashed iOS on heavy media and
// is moving to a SERVER-SIDE service that will run between the R2 upload and the
// confirm step (see useMediaUploads), stamping is_nsfw into the file metadata.
// The frontend stays agnostic to that service.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMediaItems from "./useMediaItems";
import useImageCompression from "./useImageCompression";
import useMediaUploads from "./useMediaUploads";
import {
  logProcessed,
  buildProcessedMetadata,
} from "../services/imageCompression/imageCompressor";
import { isAllowedFile, isVideoFile } from "../services/media/allowedFormats";
import { matchesDeclaredType } from "../services/media/fileSignature";

export const MAX_FILES = 10;

// Per-type size limits (FE gives precise, friendly feedback BEFORE uploading;
// the backend keeps a general 100 MB hard cap as the real guard).
const IMAGE_MAX_BYTES = 8 * 1024 * 1024; // JPG/PNG/WEBP
const GIF_MAX_BYTES = 15 * 1024 * 1024; // animated GIF (image/gif)
// DECIMAL 100 MB on purpose, not 100 MiB (104,857,600): Cloudflare Media
// Transformations requires sources STRICTLY under 100 MiB, so the round
// decimal cap keeps a ~4.5 MiB safety margin AND matches the "100 MB" label
// shown to the user. Keep in sync with the backend's UPLOAD_MAX_BYTES.
const VIDEO_MAX_BYTES = 100_000_000; // video

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

// Minimal config metadata for a video (no compression report, no client
// verdict). Same whitelisted keys as images so the backend stores it
// consistently; the server-side classifier fills is_nsfw later.
function videoMetadata(item) {
  return { archivo: item.name };
}

// Measures a video file's intrinsic dimensions from its metadata (a detached
// <video preload="metadata"> — only the header is read, never the full file).
// The backend stores width/height per file so the UI can reserve the EXACT
// aspect-ratio before the video loads (no placeholder → real-size layout jump).
// Resolves {0,0} on error/timeout — dimensions must never block an upload.
function measureVideoDimensions(file) {
  return new Promise((resolve) => {
    let url;
    try {
      url = URL.createObjectURL(file);
    } catch (err) {
      resolve({ width: 0, height: 0 });
      return;
    }
    const v = document.createElement("video");
    let settled = false;
    const done = (width, height) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      try {
        v.load();
      } catch (err) {
        /* releasing the element is best-effort */
      }
      resolve({ width, height });
    };
    const timer = setTimeout(() => done(0, 0), 5000);
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      clearTimeout(timer);
      done(v.videoWidth || 0, v.videoHeight || 0);
    };
    v.onerror = () => {
      clearTimeout(timer);
      done(0, 0);
    };
    v.src = url;
  });
}

export default function useMediaComposer() {
  const media = useMediaItems();
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

  // Video dimensions, measured async from the file's metadata BEFORE its upload
  // starts (id → {width,height} | "pending"). The tick re-runs the effect below
  // when a measurement lands.
  const videoDimsRef = useRef(new Map());
  const [dimsTick, setDimsTick] = useState(0);

  // Auto-start each file's upload as soon as it's ready. Images wait for their
  // compression (downscaled WebP, metadata stripped); videos wait for their
  // (fast, metadata-only) dimension probe, then upload the original. No NSFW
  // gate — nothing waits on a client classification. startUpload is idempotent
  // per id.
  const loggedRef = useRef(new Set());
  useEffect(() => {
    media.items.forEach((item) => {
      if (item.kind === "image") {
        const comp = compressionByFile.get(item.file);
        if (!comp || comp.status !== "done" || !comp.report || !comp.file) return;
        if (!loggedRef.current.has(item.id)) {
          loggedRef.current.add(item.id);
          logProcessed(comp.report);
        }
        startUpload(item.id, comp.report.name, {
          file: comp.file,
          contentType: comp.file.type || "image/webp",
          isVideo: false,
          report: comp.report,
          metadata: buildProcessedMetadata(comp.report),
          filenameOriginal: comp.report.name,
        });
      } else if (item.kind === "video") {
        // Measure the intrinsic dimensions FIRST (metadata-only, ~instant; a
        // 5s timeout resolves {0,0} so a weird container never blocks the
        // upload). They travel in the confirm as width/height so the UI can
        // reserve the real aspect-ratio before the video loads (no layout jump).
        const dims = videoDimsRef.current.get(item.id);
        if (!dims) {
          videoDimsRef.current.set(item.id, "pending");
          measureVideoDimensions(item.file).then((measured) => {
            videoDimsRef.current.set(item.id, measured);
            setDimsTick((n) => n + 1); // re-run this effect with dims ready
          });
          return;
        }
        if (dims === "pending") return;
        // Upload the ORIGINAL video as-is (no client compression/scan). The
        // server-side classifier (future) flags is_nsfw before confirm. The
        // measured dims ride in `report` — confirmAll reads report.width/height.
        startUpload(item.id, item.name, {
          file: item.file,
          contentType: videoContentType(item.file),
          isVideo: true,
          report: { width: dims.width, height: dims.height },
          metadata: videoMetadata(item),
          filenameOriginal: item.name,
        });
      }
    });
    if (media.items.length === 0 && compression.results.length === 0) {
      loggedRef.current.clear();
      videoDimsRef.current.clear();
    }
  }, [media.items, compression.results, compressionByFile, startUpload, dimsTick]);

  // Validate the selection (size / type / count / real content) and start
  // processing accepted files. Async: after the cheap name/size checks, the
  // first bytes of each candidate are read to verify the ACTUAL signature
  // (magic bytes) matches the claimed format — a .txt renamed to .png is
  // rejected here instead of producing a broken upload. Returns
  // { error: { key, params } | null } so the caller translates it.
  const addFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return { error: null };
      const availableSlots = MAX_FILES - media.items.length;
      if (availableSlots <= 0) {
        return { error: { key: "post.maxFiles", params: { max: MAX_FILES } } };
      }
      const candidates = [];
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
        candidates.push(file);
      });
      // Content check (magic bytes) — ~16 bytes per file, effectively instant.
      const verdicts = await Promise.all(candidates.map(matchesDeclaredType));
      const accepted = [];
      const mismatchedNames = []; // extension says image/video, content doesn't
      candidates.forEach((file, i) => {
        if (verdicts[i]) accepted.push(file);
        else mismatchedNames.push(file.name || "?");
      });
      // Surface the format rejection first (the confusing case, e.g. HEIC),
      // then the content mismatch, then size, then the count cap.
      let error = null;
      if (rejectedNames.length > 0) {
        error = {
          key: "post.formatRejected",
          params: { names: rejectedNames.join(", ") },
        };
      } else if (mismatchedNames.length > 0) {
        error = {
          key: "post.contentRejected",
          params: { names: mismatchedNames.join(", ") },
        };
      } else if (sizeError) {
        error = sizeError;
      } else if (files.length > availableSlots) {
        error = { key: "post.maxFiles", params: { max: MAX_FILES } };
      }
      if (accepted.length > 0) {
        media.addFiles(accepted);
        // compression.compress filters to images internally; videos are skipped.
        compression.compress(accepted);
      }
      return { error };
    },
    [media, compression]
  );

  const removeItem = useCallback(
    (id) => {
      media.removeItem(id);
      removeUpload(id);
    },
    [media, removeUpload]
  );

  const itemsById = useMemo(() => {
    const map = new Map();
    media.items.forEach((item) => map.set(item.id, item));
    return map;
  }, [media.items]);

  // Attach every uploaded object to the thread (called at submit, once the
  // thread exists). Best-effort per file. Passes itemsById so confirmAll
  // reads each file's CURRENT isSpoiler flag (toggled anytime before Send).
  const confirmTo = useCallback(
    (threadUid) => confirmAll(threadUid, itemsById),
    [confirmAll, itemsById]
  );

  const clear = useCallback(() => {
    media.clear();
    compression.clear();
    clearUploads();
    loggedRef.current.clear();
  }, [media, compression, clearUploads]);

  const isCompressing = compression.results.some(
    (r) => r.status === "queued" || r.status === "compressing"
  );

  return {
    items: media.items,
    compressionByFile,
    uploadsById,
    // Busy = still compressing or uploading → block submit so we never post a
    // thread that references an incomplete upload.
    pending: isCompressing || uploadsPending,
    count: media.items.length,
    attachDisabled: media.items.length >= MAX_FILES,
    addFiles,
    removeItem,
    toggleSpoiler: media.toggleSpoiler,
    retryUpload,
    confirmTo,
    clear,
  };
}
