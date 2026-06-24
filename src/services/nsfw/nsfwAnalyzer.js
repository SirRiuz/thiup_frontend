// Classifies images and video frames with an already-loaded NSFWJS model and
// turns the raw predictions into a verdict: "safe" | "review" | "block".
//
// Predictions shape from model.classify(): [{ className, probability }] with
// the 5 classes Drawing, Hentai, Neutral, Porn, Sexy.

import { NSFW_CONFIG } from "./nsfwConfig";

// Some .mov files arrive with an empty MIME type, so we also sniff by
// extension.
const VIDEO_EXT_RE = /\.(mov|mp4|m4v|webm)$/i;

export function isImageFile(file) {
  return !!(file && file.type && file.type.startsWith("image/"));
}

export function isVideoFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("video/")) return true;
  if (file.type && file.type.startsWith("image/")) return false;
  return VIDEO_EXT_RE.test(file.name || "");
}

// ---- Scoring & verdict -----------------------------------------------------

// Collapses predictions into { explicit, sexy, categories }.
//   explicit = sum(Porn + Hentai)        -> drives blocking
//   sexy     = Sexy                       -> at most flags for review
function scorePredictions(predictions) {
  const categories = {};
  predictions.forEach((p) => {
    categories[p.className] = p.probability;
  });
  const explicit = NSFW_CONFIG.explicitClasses.reduce(
    (sum, c) => sum + (categories[c] || 0),
    0
  );
  const sexy = NSFW_CONFIG.suggestiveClasses.reduce(
    (sum, c) => sum + (categories[c] || 0),
    0
  );
  return { explicit, sexy, categories };
}

// Block depends ONLY on explicit content (avoids false positives from
// bikinis/dresses); "sexy" alone is at most a review flag.
export function verdictFromScore({ explicit, sexy }) {
  if (explicit >= NSFW_CONFIG.blockThreshold) {
    return { verdict: "block", score: explicit };
  }
  if (sexy >= NSFW_CONFIG.reviewThreshold) {
    return { verdict: "review", score: sexy };
  }
  return { verdict: "safe", score: Math.max(explicit, sexy) };
}

// ---- Image -----------------------------------------------------------------

// data URL (not blob:) for maximum webview compatibility.
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Attach handlers BEFORE setting src: local images can decode so fast that
    // the load event fires before the listener is attached...
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = src;
    // ...and as an extra guard, resolve immediately if it's already decoded.
    if (img.complete && img.naturalWidth > 0) resolve(img);
  });
}

export async function analyzeImage(file, model) {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  const predictions = await model.classify(img);
  const { explicit, sexy, categories } = scorePredictions(predictions);
  const { verdict, score } = verdictFromScore({ explicit, sexy });
  return { verdict, score, explicit, sexy, categories, thumbnail: dataUrl };
}

// ---- Video -----------------------------------------------------------------

function loadVideoElement(src) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    const onLoaded = () => {
      cleanup();
      resolve(video);
    };
    const onError = () => {
      cleanup();
      reject(new Error("video-load-failed"));
    };
    function cleanup() {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    }
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
    video.src = src;
  });
}

function seekVideo(video, time, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(arg);
    };
    const onSeeked = () => finish(resolve);
    const onError = () => finish(reject, new Error("seek-error"));
    const timer = setTimeout(
      () => finish(reject, new Error("seek-timeout")),
      timeoutMs
    );
    function cleanup() {
      clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    }
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

// True if the canvas drew nothing (fully transparent/black) — the signature of
// a frame the browser couldn't decode (e.g. HEVC without hardware support).
function isCanvasBlank(ctx, canvas) {
  try {
    const w = Math.min(canvas.width, 32);
    const h = Math.min(canvas.height, 32);
    const { data } = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] || data[i + 1] || data[i + 2] || data[i + 3]) return false;
    }
    return true;
  } catch (err) {
    // Tainted/unreadable canvas: assume not blank to avoid a false HEVC error.
    return false;
  }
}

function hevcSupported() {
  const v = document.createElement("video");
  return !!(
    v.canPlayType('video/mp4; codecs="hvc1"') ||
    v.canPlayType('video/mp4; codecs="hev1"')
  );
}

// Throws a typed error so the UI can show a clear message (never fail silently).
function throwDecodeError(file) {
  const name = (file.name || "").toLowerCase();
  const looksApple = /\.(mov|m4v|mp4)$/.test(name);
  const err = new Error(
    looksApple && !hevcSupported() ? "hevc-unsupported" : "video-decode-failed"
  );
  err.code = looksApple && !hevcSupported() ? "hevc" : "decode";
  throw err;
}

// Samples up to maxVideoFrames frames across the whole duration (midpoints, so
// we never land exactly on t=0 where 'seeked' may not fire), classifies each,
// and aggregates with the MAX of each group. Returns the riskiest frame as the
// thumbnail. onFrame(current, total) reports progress.
export async function analyzeVideo(file, model, { onFrame } = {}) {
  let objectUrl = null;
  let video = null;
  try {
    // Prefer a blob URL: frame seeking is far more reliable than with a data
    // URL, especially for large files. Fall back to a data URL if it fails.
    objectUrl = URL.createObjectURL(file);
    try {
      video = await loadVideoElement(objectUrl);
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
      const dataUrl = await readAsDataURL(file);
      video = await loadVideoElement(dataUrl);
    }

    const { duration, videoWidth: width, videoHeight: height } = video;
    if (!width || !height || !isFinite(duration) || duration <= 0) {
      throwDecodeError(file);
    }

    const total = Math.min(
      NSFW_CONFIG.maxVideoFrames,
      Math.max(1, Math.round(duration))
    );
    const times = [];
    for (let i = 0; i < total; i += 1) {
      times.push(((i + 0.5) / total) * duration);
    }

    const scale = Math.min(1, NSFW_CONFIG.videoCanvasMaxWidth / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");

    let maxExplicit = 0;
    let maxSexy = 0;
    let worstRisk = -1;
    let worstThumb = null;
    let worstCategories = {};
    let captured = 0;

    for (let i = 0; i < times.length; i += 1) {
      if (onFrame) onFrame(i + 1, times.length);
      try {
        // eslint-disable-next-line no-await-in-loop
        await seekVideo(video, times[i], NSFW_CONFIG.videoFrameSeekTimeoutMs);
      } catch (err) {
        continue; // skip an unseekable frame, keep going
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (isCanvasBlank(ctx, canvas)) continue; // undecodable frame
      let predictions;
      try {
        // eslint-disable-next-line no-await-in-loop
        predictions = await model.classify(canvas);
      } catch (err) {
        continue;
      }
      captured += 1;
      const { explicit, sexy, categories } = scorePredictions(predictions);
      const risk = Math.max(explicit, sexy);
      if (risk > worstRisk) {
        worstRisk = risk;
        worstThumb = canvas.toDataURL("image/jpeg", 0.7);
        worstCategories = categories;
      }
      if (explicit > maxExplicit) maxExplicit = explicit;
      if (sexy > maxSexy) maxSexy = sexy;
    }

    // Nothing decoded across every sampled frame -> can't analyze it.
    if (captured === 0) throwDecodeError(file);

    const { verdict, score } = verdictFromScore({
      explicit: maxExplicit,
      sexy: maxSexy,
    });
    return {
      verdict,
      score,
      explicit: maxExplicit,
      sexy: maxSexy,
      categories: worstCategories,
      thumbnail: worstThumb,
      frames: captured,
    };
  } finally {
    if (video) {
      try {
        video.removeAttribute("src");
        video.load();
      } catch (err) {
        /* noop */
      }
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
