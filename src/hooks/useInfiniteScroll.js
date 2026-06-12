import { useEffect, useRef } from "react";

// How far ahead of the visible bottom the next page starts loading.
// "100%" of the scroll root's height = one full screen of anticipation
// (FB/X/IG-style: by the time the user reaches the end, the page is there).
// Any CSS length works ("800px", "150%"), tunable per list via the option.
const DEFAULT_PREFETCH_DISTANCE = "100%";

/**
 * Hook that observes a sentinel and fires onLoadMore BEFORE it enters the
 * viewport, so the next page is already rendered when the user reaches it.
 * Uses IntersectionObserver — never the scroll event.
 *
 * @param {function} onLoadMore        Handler that fetches the next page.
 * @param {boolean}  hasMore           Whether there's more data to load.
 * @param {boolean}  isLoading         Whether a load is in flight (guards re-trigger).
 * @param {string}   [prefetchDistance] How early to fire, as a CSS length for
 *                                     rootMargin bottom. Default "100%" (one screen).
 * @param {Element|React.RefObject} [root] Scroll container, if not the window.
 * @returns {React.MutableRefObject}   Ref to assign to the sentinel div.
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  prefetchDistance = DEFAULT_PREFETCH_DISTANCE,
  root = null,
}) {
  const sentinelRef = useRef(null);

  // Keep the latest handler without re-creating the observer every render
  // (loadMore identities can change when pagination state updates).
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore || isLoading) return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const rootEl = root && "current" in root ? root.current : root;

    if (typeof IntersectionObserver === "undefined") {
      // Ancient-browser fallback: rAF-throttled passive scroll check.
      const margin = prefetchDistance.trim().endsWith("%")
        ? (parseFloat(prefetchDistance) / 100) * window.innerHeight
        : parseFloat(prefetchDistance) || 0;
      const target = rootEl || window;
      let ticking = false;
      const check = () => {
        ticking = false;
        if (sentinel.getBoundingClientRect().top <= window.innerHeight + margin) {
          onLoadMoreRef.current();
        }
      };
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(check);
        }
      };
      target.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => target.removeEventListener("scroll", onScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      { root: rootEl, rootMargin: `0px 0px ${prefetchDistance} 0px` }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, prefetchDistance, root]);

  return sentinelRef;
}
