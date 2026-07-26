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
//
// SCOPES: an overlay with its own inline videos (the reply dialog's parent
// preview) activates a playback scope while it's open. Candidates carry the
// scope they render in (via PlaybackScopeContext) and only candidates of the
// ACTIVE scope are eligible — IntersectionObserver can't see occlusion, so
// without this the page's videos behind the backdrop stayed "most visible"
// and the overlay's own videos could never play. Forced claims (explicit user
// intent, and the fullscreen viewer's sentinel) are tagged with the scope
// ACTIVE at the moment of the gesture — never a wildcard: a video unmuted on
// the page kept a frozen oversized candidacy (the locked scroll never
// refreshes it) that stayed eligible inside the dialog's scope and starved
// the preview forever.

let candidates = new Map(); // id -> { ratio, scope }
let ownerId = null;
let activeScope = null; // null = the base page; an open overlay claims it
const listeners = new Set();

// Ratio a video must reach to be eligible to play at all.
const MIN_RATIO = 0.5;
// A challenger must beat the current owner by this margin to steal playback —
// hysteresis so two ~equally-visible videos don't flap ownership on every
// scroll tick.
const STEAL_MARGIN = 0.1;

function eligible(candidate) {
  return candidate.scope === activeScope;
}

function recompute() {
  let best = null;
  let bestRatio = 0;
  candidates.forEach((candidate, id) => {
    if (!eligible(candidate)) return;
    if (candidate.ratio > bestRatio) {
      bestRatio = candidate.ratio;
      best = id;
    }
  });
  // Keep the current owner unless it's gone, out of scope, or clearly beaten
  // (hysteresis).
  let next = ownerId;
  const owner = ownerId != null ? candidates.get(ownerId) : undefined;
  const ownerRatio = owner && eligible(owner) ? owner.ratio : undefined;
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

// Report a video's current visibility (tagged with the scope it renders in —
// see PlaybackScopeContext). Below MIN_RATIO it stops being a candidate (and
// loses playback if it was the owner).
export function setPlaybackCandidate(id, ratio, scope = null) {
  if (ratio >= MIN_RATIO) candidates.set(id, { ratio, scope });
  else candidates.delete(id);
  recompute();
}

// Force-claim playback (explicit user intent: unmute tap, manual play, the
// fullscreen viewer opening). Ownership transfers UNCONDITIONALLY — hysteresis
// only governs visibility-driven changes, and force-vs-force must always hand
// over (two forced candidates share the oversized ratio, so recompute()'s
// margin check would ignore the newer claim). The oversized candidacy keeps
// the new owner stable until its own observer refreshes it, and belongs to
// the scope active at the gesture — so entering/leaving an overlay scope
// demotes it like any other candidate of its layer.
export function forcePlaybackOwner(id) {
  candidates.set(id, { ratio: 2, scope: activeScope });
  if (ownerId !== id) {
    ownerId = id;
    listeners.forEach((fn) => fn(ownerId));
  }
}

// Drop out entirely (unmount / left the viewport).
export function removePlaybackCandidate(id) {
  candidates.delete(id);
  recompute();
}

// An overlay with inline videos opened: only ITS candidates play from now on
// (the page's videos pause reactively — they fall out of eligibility).
export function setPlaybackScope(scope) {
  activeScope = scope;
  recompute();
}

// The overlay closed: back to the base page (guarded so a stale cleanup never
// stomps a newer overlay's scope).
export function releasePlaybackScopeIf(scope) {
  if (activeScope !== scope) return;
  activeScope = null;
  recompute();
}

export function subscribePlayback(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
