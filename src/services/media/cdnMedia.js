// Cloudflare Media Transformations URL builders — the CDN derives optimized
// assets from the ORIGINAL uploaded video on the fly (edge-cached after the
// first request): <origin>/cdn-cgi/media/<options>/<path>.
//
// Verified against the live zone (do not re-learn these the hard way):
//   - The endpoint only answers GET — a HEAD probe 404s.
//   - Inputs over CF's 100 MiB cap answer 400; unsupported sources 404. Every
//     consumer MUST keep the original URL as fallback (legacy uploads exceed
//     the cap — the app's own upload limit is 100 MB decimal ≈ 95.4 MiB, so
//     NEW uploads always transform).
//   - `fit=scale-down` + a square box caps the LONG side, preserves the
//     source aspect ratio (incl. iPhone rotation metadata) and never
//     upscales.
//   - mode=video output is H.264/AAC MP4 with the moov atom UP FRONT
//     (faststart → instant playback start; camera originals carry it at the
//     END) at roughly half the size of a camera original. Duration is
//     preserved (verified, no truncation).

// Extracted frame as the video's poster: a CHAIN of two transformations —
// the image endpoint (real `quality` + negotiated AVIF) recompressing the
// media endpoint's extracted frame. mode=frame alone only emits JPEG and
// silently IGNORES `quality` (verified: q1..q100 all byte-identical), so the
// chain is what makes posters cheap: 640px AVIF q75 ≈ 19 KB vs 48 KB plain
// JPEG (−60%), visually clean at these sizes. If the inner frame fails
// (>100 MiB source, unsupported codec) the whole chain fails → the
// consumer's onError fallback takes over.
//
// `width` ONLY on the frame (no height/fit): it keeps the video's aspect
// ratio; the 800 default comfortably covers the 640px column at 1-2x. Small
// surfaces (carousel cells, grid tiles) pass a smaller width — a decoded
// poster costs width×height×4 bytes of memory.
export function framePosterUrl(videoUrl, { width = 800 } = {}) {
  try {
    const u = new URL(videoUrl);
    const frame = `${u.origin}/cdn-cgi/media/mode=frame,time=1s,width=${width},format=jpg${u.pathname}`;
    return `${u.origin}/cdn-cgi/image/format=auto,quality=75,width=${width}/${frame}`;
  } catch {
    return null;
  }
}

// Optimized playback rendition: long side capped at 1280 — the inline render
// tops out at ~1216 device px (landscape column at 2x), so 1280 is visually
// transparent there at HALF the bytes of 1920 (measured −53%; ~720p-class,
// the IG/Threads ballpark). `quality` is a no-op in mode=video (verified) —
// the resolution IS the compression dial.
export function optimizedVideoUrl(videoUrl) {
  try {
    const u = new URL(videoUrl);
    return `${u.origin}/cdn-cgi/media/mode=video,width=1280,height=1280,fit=scale-down,audio=true${u.pathname}`;
  } catch {
    return null;
  }
}

// Optimized image rendition (CF Image Transformations, /cdn-cgi/image/).
// Uploads are ALREADY client-compressed WebP (≤2048px, imageCompressor), so a
// plain re-encode saves nothing (verified: q82 pass-through, q60 −3%) — the
// real win is DOWNSCALING to the width the layout can use + negotiated AVIF
// (`format=auto`; never force `format=avif` — without Accept negotiation it
// fell back to a JPEG BIGGER than the original). `fit=scale-down` keeps the
// aspect ratio and never upscales; `onerror=redirect` makes the CDN itself
// 307 to the original when the transform fails (missing/oversized source) —
// the client-side onError fallback then only covers the endpoint being
// absent (local dev, feature off).
export function optimizedImageUrl(imageUrl, { width = 1280 } = {}) {
  try {
    const u = new URL(imageUrl);
    return `${u.origin}/cdn-cgi/image/format=auto,quality=82,width=${width},fit=scale-down,metadata=none,onerror=redirect${u.pathname}`;
  } catch {
    return null;
  }
}

// True for any /cdn-cgi/ (image OR media) URL — used by onError guards to
// fall back to the original file only when the TRANSFORMED source failed
// (never on a detached/empty src, never re-looping on the original itself).
export function isTransformedUrl(url) {
  return typeof url === "string" && url.includes("/cdn-cgi/");
}
