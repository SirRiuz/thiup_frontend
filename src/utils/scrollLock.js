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

export function lockScroll() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockScroll() {
  if (lockCount === 0) return; // never below 0
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
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
