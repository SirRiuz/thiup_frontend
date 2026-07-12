/**
 * Session memory of media URLs that have ALREADY rendered once (grid tiles).
 *
 * The X/Threads no-blink trick for SPA back-restores: a remounted
 * `loading="lazy"` image re-runs the whole lazy pipeline (intersection →
 * fetch → decode) even when the bytes sit in the HTTP cache, which paints
 * the placeholder for a few frames — the blink. Images KNOWN to have loaded
 * this session mount `eager` instead (+ sync decode at the call site): the
 * browser reads straight from cache and paints them in the first frame.
 * First-time images keep the lazy + placeholder progressive path.
 *
 * Plain module state (no React): survives unmounts, dies with the tab.
 * FIFO-capped so an endless gallery session can't grow it unbounded.
 */
const loadedUrls = new Set();
const MAX_URLS = 600;

export function markTileMediaLoaded(url) {
  if (!url) return;
  if (loadedUrls.has(url)) return;
  loadedUrls.add(url);
  if (loadedUrls.size > MAX_URLS) {
    loadedUrls.delete(loadedUrls.values().next().value);
  }
}

export function isTileMediaLoaded(url) {
  return Boolean(url) && loadedUrls.has(url);
}
