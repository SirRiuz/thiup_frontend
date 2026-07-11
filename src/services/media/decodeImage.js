// Memory-safe image decode for iOS Safari / WebView.
//
// iPhone photos are ~12MP (4032×3024). Decoding one into a full-resolution
// HTMLImageElement AND a full-res 2D canvas (then reading its pixels) holds
// ~150MB+ at once — iOS kills the tab well before that (its memory ceiling is
// far lower than Android's), which is the crash seen during NSFW analysis and
// compression. Neither step needs full resolution (NSFW runs at ~224px;
// compression downscales anyway), so we decode DIRECTLY at a reduced size and
// free the backing store deterministically.
//
// Strategy: createImageBitmap (its native/GPU-backed buffer is freed on close(),
// unlike a lingering <img>), drawn once onto a small canvas. Fallback to
// <img> + a small canvas where createImageBitmap is unavailable. The output is
// always kept under iOS's hard canvas-area cap so it never returns blank.

// iOS Safari refuses to back a canvas larger than ~16.7M px (it silently turns
// blank / can crash). Stay below it no matter what maxSize is requested.
const IOS_MAX_CANVAS_AREA = 16777216;

// Largest side ≤ maxSize (aspect preserved), then clamped under the iOS area cap.
export function fitDimensions(w, h, maxSize) {
  let scale = 1;
  if (maxSize && Math.max(w, h) > maxSize) scale = maxSize / Math.max(w, h);
  let tw = Math.max(1, Math.round(w * scale));
  let th = Math.max(1, Math.round(h * scale));
  if (tw * th > IOS_MAX_CANVAS_AREA) {
    const a = Math.sqrt(IOS_MAX_CANVAS_AREA / (tw * th));
    tw = Math.max(1, Math.floor(tw * a));
    th = Math.max(1, Math.floor(th * a));
  }
  return { width: tw, height: th };
}

function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Attach handlers BEFORE src: a cached image can decode before the listener
    // is attached, which would otherwise hang the promise.
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = url;
    if (img.complete && img.naturalWidth > 0) resolve(img);
  });
}

function makeResult(canvas) {
  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    // Zero the dimensions so iOS frees the (potentially large) backing store
    // immediately instead of waiting for GC — call it as soon as the canvas has
    // been consumed (encoded/classified).
    release() {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

// Decodes `file` to a canvas no larger than `maxSize` on its longest side.
// Returns { canvas, width, height, release }. Always aspect-correct.
export async function decodeScaledCanvas(file, maxSize) {
  const canvas = document.createElement("canvas");

  // Path A — createImageBitmap: the full-res bitmap is transient and freed by
  // close() right after we draw the small canvas, so peak memory is ONE bitmap
  // (not <img> + full-res canvas + getImageData held together). drawImage does
  // the downscale, so this is correct even on Safari versions that ignore the
  // resize options.
  if (typeof createImageBitmap === "function") {
    let bitmap = null;
    try {
      bitmap = await createImageBitmap(file);
      const { width, height } = fitDimensions(bitmap.width, bitmap.height, maxSize);
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      bitmap = null;
      return makeResult(canvas);
    } catch (err) {
      if (bitmap) {
        try {
          bitmap.close();
        } catch (e) {
          /* already closed */
        }
      }
      // Fall through to the <img> path below.
    }
  }

  // Path B — <img> + small canvas (older WebViews without createImageBitmap).
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageEl(url);
    const { width, height } = fitDimensions(
      img.naturalWidth,
      img.naturalHeight,
      maxSize
    );
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    img.src = "";
    return makeResult(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
