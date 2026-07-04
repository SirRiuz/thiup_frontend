// Single source of truth for "which inline video is PLAYING" (Threads rule:
// only ONE video decodes/plays at a time across the whole app). Same tiny
// module-level store pattern as audioOwner, consumed via useSyncExternalStore.
//
// Why this exists: multiple high-resolution (iPhone 4K) videos playing at once
// — e.g. a carousel with two videos on screen, or several video cards visible —
// means multiple active hardware decoders + buffers. iOS Safari has few
// decoders and a low memory ceiling, and kills the tab (the crash on scroll).
// Every video registers itself as a CANDIDATE with its visibility ratio; the
// most visible one wins playback, everyone else stays paused on their poster.

let candidates = new Map(); // id -> intersection ratio
let ownerId = null;
const listeners = new Set();

// Ratio a video must reach to be eligible to play at all.
const MIN_RATIO = 0.5;
// A challenger must beat the current owner by this margin to steal playback —
// hysteresis so two ~equally-visible videos don't flap ownership on every
// scroll tick.
const STEAL_MARGIN = 0.1;

function recompute() {
  let best = null;
  let bestRatio = 0;
  candidates.forEach((ratio, id) => {
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = id;
    }
  });
  // Keep the current owner unless it's gone or clearly beaten (hysteresis).
  let next = ownerId;
  const ownerRatio = ownerId != null ? candidates.get(ownerId) : undefined;
  if (ownerRatio === undefined) {
    next = best;
  } else if (best !== ownerId && bestRatio > ownerRatio + STEAL_MARGIN) {
    next = best;
  }
  if (next !== ownerId) {
    ownerId = next;
    listeners.forEach((fn) => fn(ownerId));
  }
}

export function getPlaybackOwner() {
  return ownerId;
}

// Report a video's current visibility. Below MIN_RATIO it stops being a
// candidate (and loses playback if it was the owner).
export function setPlaybackCandidate(id, ratio) {
  if (ratio >= MIN_RATIO) candidates.set(id, ratio);
  else candidates.delete(id);
  recompute();
}

// Force-claim playback (explicit user intent: unmute tap, manual play). The
// oversized ratio wins immediately; the video's own observer then refreshes it
// with the real ratio on the next intersection tick.
export function forcePlaybackOwner(id) {
  candidates.set(id, 2);
  recompute();
}

// Drop out entirely (unmount / left the viewport).
export function removePlaybackCandidate(id) {
  candidates.delete(id);
  recompute();
}

export function subscribePlayback(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
