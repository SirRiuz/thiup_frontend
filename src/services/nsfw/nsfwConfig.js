// Client-side NSFW pre-filter — single source of truth for tuning.
//
// IMPORTANT: this is a CLIENT-SIDE pre-filter to improve the experience, NOT a
// security barrier (it is bypassable). Any critical validation must be redone
// on the backend. It detects adult/explicit content but is NOT a CSAM detector
// (that is a separate legal category with reporting obligations).
//
// Everything tunable lives here so thresholds/model can change WITHOUT touching
// the detection logic, the hook, or the UI.

export const NSFW_CONFIG = {
  // NSFWJS model name. The browser bundles below register the weights this
  // name resolves to.
  model: "MobileNetV2Mid",

  // Verdict thresholds (probabilities, 0–1).
  // Blocking depends ONLY on explicit content; "sexy" at most flags for review.
  blockThreshold: 0.61, // explicit >= this  -> "block"
  reviewThreshold: 0.7, // sexy     >= this  -> "review"

  // Video sampling.
  maxVideoFrames: 10, // up to N frames spread across the whole duration
  videoFrameSeekTimeoutMs: 12000, // give up on a frame after this long
  videoCanvasMaxWidth: 320, // downscale frames before classifying

  // Class grouping (NSFWJS returns: Drawing, Hentai, Neutral, Porn, Sexy).
  explicitClasses: ["Porn", "Hentai"], // summed -> "explicit" score
  suggestiveClasses: ["Sexy"], // -> "sexy" score (bikinis, dresses, selfies)
  safeClasses: ["Neutral", "Drawing"],

  // Pinned nsfwjs version we self-host. Must match the version installed as a
  // devDependency (package.json) AND the folder name in `assetsBase` below.
  // To update: `npm i -D nsfwjs@<new>`, bump this + assetsBase, and the
  // postinstall/prebuild copy script regenerates public/vendor/nsfwjs/<new>/.
  assetsVersion: "4.3.0",

  // Base URL the 4 assets load from. Default: a LOCAL static path served by the
  // app (same origin → no third-party CDN, no CORS). To serve from your OWN CDN
  // subdomain instead, set this to the absolute URL, e.g.
  //   "https://cdn.tudominio.com/nsfwjs/4.3.0"
  // (and ensure CORS + a `crossorigin` attr on the <script> tags if needed).
  // The 4 <script> URLs are built from this base (see NSFW_SCRIPTS).
  assetsBase: "/vendor/nsfwjs/4.3.0",
};

// The 4 self-hosted browser (UMD) bundles, in STRICT load order: the model
// definition + weight shards FIRST, the library LAST. Each registers a global
// that nsfwjs.load() picks up automatically (window.model,
// window.group1_shard1of2, window.group1_shard2of2, window.nsfwjs).
//
// NOTE: nsfwjs is installed as a devDependency ONLY to copy these prebuilt UMD
// files into public/ — we still load them via <script> (not an ESM import),
// which keeps window.nsfwjs + embedded TensorFlow.js and avoids the
// "exports is not defined" error under the bundler.
export const NSFW_SCRIPTS = [
  `${NSFW_CONFIG.assetsBase}/mobilenet_v2_mid/model.min.js`,
  `${NSFW_CONFIG.assetsBase}/mobilenet_v2_mid/group1-shard1of2.min.js`,
  `${NSFW_CONFIG.assetsBase}/mobilenet_v2_mid/group1-shard2of2.min.js`,
  `${NSFW_CONFIG.assetsBase}/nsfwjs.min.js`,
];
