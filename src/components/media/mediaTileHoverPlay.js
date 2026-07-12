/**
 * IG-explore hover preview for media-grid tiles: hovering a VIDEO tile plays
 * it (muted, looping — their exact tile video: loop + playsinline, silent);
 * leaving pauses and rewinds to the first frame, so the next hover previews
 * from the start. JS-driven like IG's (video playback can't be triggered
 * from CSS). No-op on non-video tiles and under prefers-reduced-motion.
 */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function playTileVideoOnHover(e) {
  if (prefersReducedMotion()) return;
  const video = e.currentTarget.querySelector("video");
  if (!video) return;
  const p = video.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

export function stopTileVideoOnLeave(e) {
  const video = e.currentTarget.querySelector("video");
  if (!video) return;
  video.pause();
  try {
    video.currentTime = 0;
  } catch (err) {
    /* metadata not ready yet — nothing to rewind */
  }
}
