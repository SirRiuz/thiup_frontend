// Compresses an image File entirely in the browser:
//   decode -> draw on a <canvas> -> re-encode to WebP (with fallbacks).
// Re-encoding through the canvas strips EVERY piece of metadata (EXIF, GPS,
// XMP, ICC, dates, camera info), so the output is clean and ready to upload.
// Nothing is sent to a server here.

import { COMPRESSION_CONFIG } from "./compressionConfig";
import { readImageMetadata } from "./metadataReader";

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error("read-failed"));
    fr.readAsArrayBuffer(file);
  });
}

// data URL (not blob:) — more compatible than blob: inside webviews.
function readAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error("read-failed"));
    fr.readAsDataURL(blob);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Attach handlers BEFORE src: local images can decode before the listener
    // is attached, which would otherwise hang the promise.
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = url;
    if (img.complete && img.naturalWidth > 0) resolve(img);
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch (err) {
      resolve(null);
    }
  });
}

// Dominant color (ported from the reference demo): samples the image small,
// buckets colors and picks the most populous bucket (averaged for a
// representative tone). Returns { r, g, b }.
function dominantColor(srcCanvas) {
  const target = 48;
  const ratio = Math.min(target / srcCanvas.width, target / srcCanvas.height, 1);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(srcCanvas.width * ratio));
  c.height = Math.max(1, Math.round(srcCanvas.height * ratio));
  const ctx = c.getContext("2d");
  ctx.drawImage(srcCanvas, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const buckets = new Map();
  let best = null;
  let bestN = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 125) {
      // skip near-transparent
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      let e = buckets.get(key);
      if (!e) {
        e = { r: 0, g: 0, b: 0, n: 0 };
        buckets.set(key, e);
      }
      e.r += r;
      e.g += g;
      e.b += b;
      e.n += 1;
      if (e.n > bestN) {
        bestN = e.n;
        best = e;
      }
    }
  }
  if (!best) return { r: 128, g: 128, b: 128 };
  return {
    r: Math.round(best.r / best.n),
    g: Math.round(best.g / best.n),
    b: Math.round(best.b / best.n),
  };
}

function rgbToHex(c) {
  return `#${[c.r, c.g, c.b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(c) {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

// Loads an ESM module from a URL at runtime WITHOUT the bundler trying to
// resolve/bundle it (the indirect call is opaque to webpack). Used only for the
// Safari WebP/AVIF fallback, so jSquash is never in the main bundle.
// eslint-disable-next-line no-new-func
const importEsm = new Function("url", "return import(url);");

// Encodes the canvas to the requested format. Uses the native encoder when it
// exists (e.g. Chrome/Firefox/Edge for WebP). When it doesn't (Safari for
// WebP/AVIF), falls back to a WebAssembly encoder (jSquash). Last resort: native
// JPEG, which works everywhere — so the user is never left without output.
async function encodeCanvas(canvas, type, quality) {
  const native = await canvasToBlob(canvas, type, quality);
  if (native && native.type === type) return { blob: native, type };

  try {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const q = Math.round(quality * 100);
    if (type === "image/webp") {
      const mod = await importEsm("https://esm.sh/@jsquash/webp");
      const buf = await mod.encode(imageData, { quality: q });
      return { blob: new Blob([buf], { type: "image/webp" }), type: "image/webp" };
    }
    if (type === "image/avif") {
      const mod = await importEsm("https://esm.sh/@jsquash/avif");
      const buf = await mod.encode(imageData, { quality: q });
      return { blob: new Blob([buf], { type: "image/avif" }), type: "image/avif" };
    }
    const mod = await importEsm("https://esm.sh/@jsquash/jpeg");
    const buf = await mod.encode(imageData, { quality: q });
    return { blob: new Blob([buf], { type: "image/jpeg" }), type: "image/jpeg" };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("jSquash encoder failed, falling back to native JPEG:", err);
    const jpg = await canvasToBlob(canvas, "image/jpeg", quality);
    if (jpg) return { blob: jpg, type: "image/jpeg" };
    throw new Error("encode-failed");
  }
}

// Compresses one image File. Returns { outputFile, blob, type, report }.
// `report` feeds the DevTools logger (logCompression).
export async function compressImage(file, config = COMPRESSION_CONFIG) {
  const { outputFormat, quality, maxDimension } = config;

  // "Before": read original bytes only to report metadata (the output won't
  // carry any).
  const buf = await readAsArrayBuffer(file);
  const meta = readImageMetadata(buf, file.type);

  // Decode.
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  // Draw to canvas at natural size, or downscaled if maxDimension is set
  // (inactive by default — the hook is prepared but null).
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (maxDimension && Math.max(w, h) > maxDimension) {
    const scale = maxDimension / Math.max(w, h);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);

  // Representative color of the photo (for the UI chip).
  const dom = dominantColor(canvas);
  const dominantColorHex = rgbToHex(dom);
  const dominantFg = luminance(dom) > 0.55 ? "#1a1a1a" : "#fdfcf8";

  // Encode (strips all metadata as a side effect).
  const { blob, type } = await encodeCanvas(canvas, outputFormat, quality);
  const ext = type.split("/")[1].replace("jpeg", "jpg");
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const outputFile = new File([blob], `${baseName}.${ext}`, { type });

  // Re-read the OUTPUT and parse its metadata too — so "after" is verified
  // (proven empty), not merely assumed.
  let metadataAfter = [];
  try {
    const outBuf = await readAsArrayBuffer(blob);
    metadataAfter = readImageMetadata(outBuf, type).items;
  } catch (err) {
    /* if the output can't be re-read, leave it empty */
  }

  const report = {
    name: file.name,
    formatBefore:
      meta.format || (file.type ? file.type.split("/")[1].toUpperCase() : "—"),
    formatAfter: type.split("/")[1].toUpperCase(),
    width: w,
    height: h,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    savingsPct: file.size > 0 ? Math.round((1 - blob.size / file.size) * 100) : 0,
    metadataBefore: meta.items,
    metadataAfter,
    dominantColor: dominantColorHex,
    dominantFg,
  };

  return { outputFile, blob, type, report };
}

// ---- DevTools logging ------------------------------------------------------

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function metadataToText(items) {
  if (!items || !items.length) return "none";
  return items
    .map((it) => (it.sensitive ? "⚠ " : "") + it.label + (it.value ? `: ${it.value}` : ""))
    .join(" · ");
}

// Some webviews don't implement every console method; point any missing one at
// console.log so the grouped report never throws.
function ensureConsoleShim() {
  if (typeof console === "undefined") return;
  const fallback = typeof console.log === "function" ? console.log.bind(console) : () => {};
  ["groupCollapsed", "groupEnd", "table", "info", "debug", "warn", "error"].forEach((m) => {
    if (typeof console[m] !== "function") console[m] = fallback;
  });
}

const pct = (v) => `${Math.round((v || 0) * 100)}%`;

// Builds the per-file CONFIG metadata object (compression + NSFW attributes).
// This is the SAME object logged to DevTools and sent to the backend as the
// ThreadFile `metadata` — keep its keys aligned with the backend whitelist
// (app/rest/serializers/thread_file_serializer.py::ALLOWED_METADATA_KEYS).
// `nsfw` is the scan result ({ verdict, score, explicit, sexy }) or null.
export function buildProcessedMetadata(report, nsfw) {
  const data = {
    archivo: report.name,
    formatoAntes: report.formatBefore,
    formatoDespues: report.formatAfter,
    dimensiones: `${report.width}×${report.height}`,
    pesoAntes: fmtBytes(report.sizeBefore),
    pesoDespues: fmtBytes(report.sizeAfter),
    ahorroPorcentaje: `${report.savingsPct}%`,
    colorPredominante: report.dominantColor,
    metadatosAntes: metadataToText(report.metadataBefore),
    metadatosDespues:
      report.metadataAfter && report.metadataAfter.length
        ? metadataToText(report.metadataAfter)
        : "ninguno (eliminados)",
  };
  if (nsfw) {
    const labels = { safe: "Seguro", review: "Revisar", block: "Bloquear" };
    data.prediccion = labels[nsfw.verdict] || nsfw.verdict;
    data.esNsfw = nsfw.verdict === "safe" ? "no" : "sí";
    data.nsfwPorcentaje = pct(nsfw.score); // overall verdict confidence
    data.explicito = pct(nsfw.explicit); // Porn + Hentai
    data.sugerente = pct(nsfw.sexy); // Sexy
  }
  return data;
}

// Prints ONE collapsed summary per image to the DevTools console once the file
// has been fully processed (compression + NSFW analysis).
export function logProcessed(report, nsfw) {
  ensureConsoleShim();
  /* eslint-disable no-console */
  console.groupCollapsed(`🗜️ ${report.name}`);
  console.table(buildProcessedMetadata(report, nsfw));
  console.groupEnd();
  /* eslint-enable no-console */
}
