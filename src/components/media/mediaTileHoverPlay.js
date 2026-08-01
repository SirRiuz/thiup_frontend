/**
 * IG-explore hover preview for media-grid tiles: hovering a VIDEO tile plays
 * it (muted, looping — their exact tile video: loop + playsinline, silent);
 * leaving detaches the source (releasing the media pipeline — buffer +
 * decoder — like ThreadMedia does on playback-ownership loss; the poster
 * attribute keeps painting the frame) and the next hover re-attaches it and
 * previews from the start. JS-driven like IG's (video playback can't be
 * triggered from CSS). No-op on non-video tiles and under
 * prefers-reduced-motion.
 */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function playTileVideoOnHover(e) {
  if (prefersReducedMotion()) return;
  const video = e.currentTarget.querySelector("video");
  if (!video) return;
  // Re-attach the source detached on the last leave (play() on a src-less
  // element is a no-op).
  if (!video.getAttribute("src") && video.dataset.tileSrc) {
    video.src = video.dataset.tileSrc;
  }
  const p = video.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

export function stopTileVideoOnLeave(e) {
  const video = e.currentTarget.querySelector("video");
  if (!video) return;
  video.pause();
  // Release the media pipeline: pause() alone keeps the buffered segments and
  // a hardware decoder claimed for the rest of the session — sweeping a grid
  // stacked one per hovered tile (the exact class of retention the playback
  // arbiter exists to prevent; these tiles bypass it). Detaching drops both;
  // load() resets to 0:00 so the next hover previews from the start, and the
  // poster attribute repaints the resting frame.
  const src = video.getAttribute("src");
  if (src) {
    video.dataset.tileSrc = src;
    video.removeAttribute("src");
    video.load();
  }
}
