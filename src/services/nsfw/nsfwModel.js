// Loads the self-hosted NSFWJS browser bundle and exposes a singleton model.
//
// Everything runs in the browser. The assets are served from our own origin
// (see NSFW_SCRIPTS / assetsBase in nsfwConfig) — no third-party CDN. They are
// downloaded once and then cached by the browser.

import { NSFW_CONFIG, NSFW_SCRIPTS } from "./nsfwConfig";

// Some webviews don't implement every console method (e.g. console.info), and
// TensorFlow.js calls them at startup. Point any missing one at console.log so
// the library doesn't crash on init.
function ensureConsoleShim() {
  if (typeof console === "undefined") return;
  const fallback =
    typeof console.log === "function" ? console.log.bind(console) : () => {};
  const methods = [
    "info",
    "debug",
    "warn",
    "error",
    "group",
    "groupCollapsed",
    "groupEnd",
    "table",
    "trace",
    "dir",
    "time",
    "timeEnd",
    "assert",
  ];
  methods.forEach((m) => {
    if (typeof console[m] !== "function") console[m] = fallback;
  });
}

// One in-flight/resolved promise per script src (never inject twice).
const scriptPromises = new Map();

function loadScript(src) {
  if (scriptPromises.has(src)) return scriptPromises.get(src);
  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-nsfw-src="${src}"]`);
    if (existing && existing.dataset.loaded === "true") {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    // async=false preserves execution order across appended scripts — the
    // weight shards MUST run before the library.
    script.async = false;
    script.dataset.nsfwSrc = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
  scriptPromises.set(src, promise);
  return promise;
}

let modelPromise = null;

// Loads the model once and reuses it for every file. Returns the NSFWJS model.
// On failure the cached promise is cleared so a later call can retry.
export function loadNsfwModel() {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    ensureConsoleShim();
    // Strict order: model definition + weight shards first, library last.
    for (const src of NSFW_SCRIPTS) {
      // eslint-disable-next-line no-await-in-loop
      await loadScript(src);
    }
    // Each asset registers a global; if any is missing the base path is almost
    // certainly misconfigured (e.g. assetsBase points nowhere / wrong version).
    const missing = ["model", "group1_shard1of2", "group1_shard2of2", "nsfwjs"].filter(
      (g) => typeof window[g] === "undefined"
    );
    if (missing.length) {
      throw new Error(
        `NSFW assets not loaded (missing globals: ${missing.join(", ")}). ` +
          `Check NSFW_CONFIG.assetsBase ("${NSFW_CONFIG.assetsBase}").`
      );
    }
    if (typeof window.nsfwjs.load !== "function") {
      throw new Error("nsfwjs failed to initialize");
    }
    return window.nsfwjs.load(NSFW_CONFIG.model);
  })().catch((err) => {
    modelPromise = null;
    throw err;
  });
  return modelPromise;
}
