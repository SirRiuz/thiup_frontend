import { useEffect } from "react";

/**
 * CENTRALIZED body scroll-lock with a reference counter.
 *
 * Why: with scattered direct manipulations of document.body.style.overflow,
 * two lockers clobber each other. Real case (direct load of /post/:id):
 * the splash locks (saves ""), the Post locks during its loading and saves
 * "hidden" (the splash's value!); the splash restores "", and when the Post
 * finishes loading it "restores"... "hidden" → body locked forever.
 *
 * With the counter, the original overflow is saved ONLY on the first
 * acquisition and restored ONLY when the last lock is released — multiple
 * components can lock without clobbering each other.
 */

let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    // Measure the scrollbar BEFORE hiding it: on desktop the vertical scrollbar
    // takes real width (~15-17px), so removing it would widen the page and shift
    // the content sideways (the jump). Compensate by padding the body by exactly
    // that width. On mobile / overlay scrollbars this is 0 → no phantom padding.
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;
    if (scrollbarWidth > 0) {
      const current =
        parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${current + scrollbarWidth}px`;
      // Exposed so any position:fixed element anchored to the right edge can
      // compensate too (e.g. `right: var(--scrollbar-compensation, 0px)`).
      document.documentElement.style.setProperty(
        "--scrollbar-compensation",
        `${scrollbarWidth}px`
      );
    }
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) return; // never below 0
  lockCount -= 1;
  if (lockCount === 0) {
    // Restore EXACTLY the previous inline values (not assumed empty/0).
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPaddingRight;
    document.documentElement.style.removeProperty("--scrollbar-compensation");
  }
}

/**
 * Hook: locks the scroll while `active` is true. The unlock runs both
 * when active goes to false (visibility) and on unmount (cleanup) —
 * impossible to leave an orphaned lock.
 */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockScroll();
    return () => unlockScroll();
  }, [active]);
}
