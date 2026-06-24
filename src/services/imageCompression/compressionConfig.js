// Client-side image compression — single source of truth for tuning.
//
// Everything runs in the browser: each selected image is redrawn onto a
// <canvas> and re-encoded, which ALSO strips every piece of metadata
// (EXIF, GPS, XMP, ICC, dates, camera info). Nothing is uploaded.
//
// Change these values here — never inline in the algorithm — so format/quality
// can be re-tuned in one place without touching the compression logic.

export const COMPRESSION_CONFIG = {
  // Output format. Default and, for now, ALWAYS "image/webp" (light + well
  // supported). It could later become "image/avif" (even smaller, slower to
  // encode) or "image/jpeg" — the encoder already handles the fallback chain,
  // so changing this value alone should be enough.
  outputFormat: "image/webp",

  // Compression quality, range 0..1 for canvas.toBlob (jSquash gets quality*100).
  // Default is ALWAYS 0.5 (50%), chosen on purpose: higher = better quality and
  // heavier; lower = lighter with more loss. This is the FIRST knob to adjust.
  quality: 0.5,

  // Optional downscale cap (null = no limit, the default). If set to a number,
  // the largest side is capped to this many px (aspect ratio preserved) before
  // encoding, to save even more. The hook is wired but inactive by default.
  maxDimension: null,
};

// NOTE FOR THE FUTURE (video is OUT OF SCOPE in this iteration): when video
// compression is added, it must ALSO strip ALL metadata (e.g. container-level
// metadata). Re-encoding the stream removes it, but this requirement must not
// be forgotten — keep it as explicit as the image rule above.
export const VIDEO_METADATA_NOTE =
  "Video compression (future): re-encode must also strip ALL container metadata.";
