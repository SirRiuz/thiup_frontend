import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Global scroll manager — TOTAL control of the scroll (anti-drift).
 *
 * Why manual: with scrollRestoration 'auto' the browser restored on its own
 * COMPETING with React's render (and with manual restorations). Each return
 * could be clamped against a transient height and end up off; the next
 * navigation saved that already-off position as the new baseline →
 * cumulative drift in the feed. With 'manual' the browser doesn't touch the
 * scroll and everything is controlled here deterministically.
 *
 * Mechanism:
 *  - Passive tracking of window.scrollY in a ref (last REAL value while the
 *    screen was alive). You can't read window.scrollY when changing route:
 *    by then the DOM has already changed and may have clamped.
 *  - When the history entry changes (location.key), the EXACT position of
 *    the entry being left is persisted — only once, at the instant of
 *    leaving (and never re-saved after restoring: anti-drift). It is also
 *    saved by PATHNAME (for the thread → Home case below).
 *  - POP (back/forward): restores the saved position of that entry, with
 *    per-frame retries (the final height may arrive late) until landing
 *    EXACTLY or exhausting attempts.
 *  - PUSH back to a RAIL screen (/home, /search, /me): RESTORES the last
 *    position of that screen instead of going to the top — keyed by FULL URL
 *    (pathname+search): only restores the exact match (returning to
 *    /search?q=x restores; opening /search?q=NEW is a new search → top).
 *    Each screen's state lives in its contexts/caches (FeedContext,
 *    SearchCacheContext, My threads cache) → immediate height on remount,
 *    reliable restoration. The "active tab → top" case never reaches here:
 *    NavRail intercepts the click on the active item (preventDefault, no
 *    navigation) and smooth-scrolls the window itself.
 *  - PUSH (or REPLACE that changes pathname): scroll to top (new page).
 *    REPLACE of the same pathname (e.g. typing in the search rewrites ?q=):
 *    the scroll is not touched.
 *
 * Covers ALL the screens (feed, search, post) and ALL the navigations
 * (threads, tags) with a single mechanism — no duplicated restorers.
 */

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// Exact position per history entry (location.key is unique per entry in
// React Router v6). Simple cap to avoid growing without limit.
const positions = new Map();
const MAX_POSITIONS = 50;

// Last known position by FULL URL (pathname+search) — to restore the rail
// screens when returning via PUSH (new key, no per-entry position). Lives at
// module level: survives the screens' unmount. The key includes the search
// to avoid restoring old scroll over new content (different ?tag= = different
// search).
const lastPosByUrl = new Map();

// Rail screens with state cached outside the component (immediate height on
// remount): only there is the PUSH restoration reliable.
const RAIL_RESTORE_PATHS = new Set(["/home", "/search", "/me"]);

function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();

  const lastScrollRef = useRef(window.scrollY);
  const prevKeyRef = useRef(location.key);
  const prevPathRef = useRef(location.pathname);
  const prevUrlRef = useRef(location.pathname + location.search);

  // Passive tracking: only updates the ref (doesn't persist anything by itself).
  useEffect(() => {
    const onScroll = () => {
      lastScrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const prevKey = prevKeyRef.current;
    const prevPath = prevPathRef.current;
    if (prevKey === location.key) return undefined; // initial mount

    // Persists the exact position of the entry being left — by key (POP) and
    // by full URL (return to a rail screen via PUSH).
    positions.set(prevKey, lastScrollRef.current);
    if (positions.size > MAX_POSITIONS) {
      positions.delete(positions.keys().next().value);
    }
    lastPosByUrl.set(prevUrlRef.current, lastScrollRef.current);
    if (lastPosByUrl.size > MAX_POSITIONS) {
      lastPosByUrl.delete(lastPosByUrl.keys().next().value);
    }
    prevKeyRef.current = location.key;
    prevPathRef.current = location.pathname;
    prevUrlRef.current = location.pathname + location.search;

    // Exact restoration with per-frame retries. The first attempt is
    // synchronous (layout effect, before the paint): with cached state
    // rendering at once, it usually lands without any jump.
    const restoreTo = (target) => {
      let attempts = 0;
      let rafId = 0;
      const restore = () => {
        window.scrollTo(0, target);
        lastScrollRef.current = window.scrollY;
        attempts += 1;
        if (Math.abs(window.scrollY - target) > 1 && attempts < 20) {
          rafId = requestAnimationFrame(restore);
        }
      };
      restore();
      return () => cancelAnimationFrame(rafId);
    };

    if (navigationType === "POP") {
      // Going back/forward: exact restoration of THAT entry.
      return restoreTo(positions.get(location.key) ?? 0);
    }

    // PUSH BACK to a rail screen: restore its last position — only with an
    // EXACT URL match (pathname+search): same content, same height (the
    // states live cached outside the components). Clicking the item while
    // ALREADY on that screen doesn't enter here (prevPath === pathname) →
    // falls to the top below (active tab).
    const currentUrl = location.pathname + location.search;
    if (
      navigationType === "PUSH" &&
      RAIL_RESTORE_PATHS.has(location.pathname) &&
      prevPath !== location.pathname &&
      lastPosByUrl.has(currentUrl)
    ) {
      return restoreTo(lastPosByUrl.get(currentUrl));
    }

    // PUSH (or REPLACE that changes screen): new page → top.
    // REPLACE of the same pathname (?q= while typing) doesn't touch the scroll.
    if (navigationType === "PUSH" || prevPath !== location.pathname) {
      window.scrollTo(0, 0);
      lastScrollRef.current = 0;
    }
    return undefined;
  }, [location.key, location.pathname, location.search, navigationType]);

  return null;
}

export default ScrollToTop;
