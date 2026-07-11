/**
 * Direct-to-bucket media upload, decoupled from posting:
 *
 *   1. presign  → POST /thread-files/presign/   (apiFetch: gateway + E2E crypto
 *                 + ticket). No thread yet — the backend creates a DETACHED
 *                 pending record bound to the mask and returns a PUT URL.
 *   2. upload   → raw PUT straight to R2 via XMLHttpRequest (so we get upload
 *                 PROGRESS — fetch() can't report upload progress). Same
 *                 Content-Type the presign was signed with, or R2 rejects it.
 *   3. confirm  → POST /thread-files/confirm/   (apiFetch), called at Send once
 *                 the thread exists: the backend verifies the object in R2 and
 *                 attaches it to the thread.
 *
 * Steps 1–2 run automatically as soon as a file finishes compression + NSFW;
 * step 3 runs when the user posts.
 */
import { apiFetch, APIError } from "./client";

const PRESIGN_ENDPOINT = "/thread-files/presign/";
const CONFIRM_ENDPOINT = "/thread-files/confirm/";

/**
 * Step 1 — ask the backend for a presigned PUT URL (no thread).
 *
 * @param {{ contentType:string, isVideo?:boolean, filenameOriginal?:string,
 *           signal?:AbortSignal }} params
 * @returns {Promise<{upload_url:string, headers:object, key:string, uid:string,
 *           public_url:string, expires_in:number}>}
 */
export function presignThreadFile({
  contentType,
  isVideo = false,
  filenameOriginal = "",
  signal,
}) {
  return apiFetch(PRESIGN_ENDPOINT, {
    method: "POST",
    signal,
    body: JSON.stringify({
      content_type: contentType,
      is_video: isVideo,
      filename_original: filenameOriginal,
    }),
  });
}

/**
 * Step 2 — PUT the file straight to R2 with progress, via XMLHttpRequest.
 * `onProgress(percent)` is called with an integer 0–100 from real uploaded
 * bytes (xhr.upload.onprogress).
 *
 * @param {{ uploadUrl:string, file:Blob, contentType:string,
 *           onProgress?:(p:number)=>void, signal?:AbortSignal }} params
 * @returns {Promise<void>}
 */
export function uploadToBucket({ uploadUrl, file, contentType, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else {
        // 403 here usually means an expired signed URL → caller re-presigns.
        reject(new APIError(`Bucket upload failed: ${xhr.status}`, xhr.status, null));
      }
    };
    xhr.onerror = () =>
      reject(new APIError("Bucket upload network error", 0, null));
    xhr.onabort = () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      reject(err);
    };

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}

/**
 * Steps 1–2 — presign then upload (with progress). Returns the presign result
 * (uid/key/public_url) once the object is in R2. No thread involved yet.
 *
 * @param {{ file:File, contentType?:string, isVideo?:boolean,
 *           filenameOriginal?:string, onProgress?:(p:number)=>void,
 *           signal?:AbortSignal }} params
 * @returns {Promise<object>} presign result.
 */
export async function presignAndUpload({
  file,
  contentType,
  isVideo = false,
  filenameOriginal = "",
  onProgress,
  signal,
}) {
  const type = contentType || file.type || "image/webp";
  const presigned = await presignThreadFile({
    contentType: type,
    isVideo,
    filenameOriginal,
    signal,
  });
  await uploadToBucket({
    uploadUrl: presigned.upload_url,
    file,
    // Use the Content-Type the backend actually signed with (authoritative).
    contentType: presigned.headers?.["Content-Type"] || type,
    onProgress,
    signal,
  });
  return presigned;
}

/**
 * Step 3 — confirm: attach the uploaded object to the thread (at Send).
 *
 * @param {{ uid:string, thread:string, isVideo?:boolean, width?:number,
 *           height?:number, targetColor?:string, isNsfw?:boolean,
 *           metadata?:object, signal?:AbortSignal }} params
 * @returns {Promise<object>} The persisted record.
 */
export function confirmThreadFile({
  uid,
  thread,
  isVideo = false,
  width = 0,
  height = 0,
  targetColor = "161c1e",
  isNsfw = false,
  metadata = {},
  signal,
}) {
  return apiFetch(CONFIRM_ENDPOINT, {
    method: "POST",
    signal,
    body: JSON.stringify({
      uid,
      thread,
      is_video: isVideo,
      width,
      height,
      target_color: targetColor,
      is_nsfw: isNsfw,
      metadata,
    }),
  });
}
