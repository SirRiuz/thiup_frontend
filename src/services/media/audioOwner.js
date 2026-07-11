// Single source of truth for "which video currently has audio" (Instagram /
// TikTok rule: only ONE video unmuted at a time). A tiny module-level store —
// no dependencies — consumed by every <video> via useSyncExternalStore. When a
// video claims audio, all others derive muted=true reactively, across the whole
// feed (not just one carousel).

// Sentinel owner id for the fullscreen viewer's player (distinct from any
// preview's item.id, so claiming it mutes the preview of the same video).
export const VIEWER_AUDIO_ID = "__media_viewer__";

let ownerId = null;
const listeners = new Set();

export function getAudioOwner() {
  return ownerId;
}

export function setAudioOwner(id) {
  if (ownerId === id) return;
  ownerId = id;
  listeners.forEach((fn) => fn(ownerId));
}

// Release audio only if `id` currently owns it (e.g. it scrolled off-screen or
// unmounted) — avoids stomping a newer owner.
export function clearAudioOwnerIf(id) {
  if (ownerId === id) setAudioOwner(null);
}

export function subscribeAudioOwner(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
