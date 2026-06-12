import { createContext, useContext, useRef, useCallback } from "react";

/**
 * Global cache of the /search-new state by search key ('q:<query>' for query
 * mode, 't:<tag>' for tag mode), to preserve results, active tab/sort and
 * scroll on going back (POP) — the same pattern ThreadCacheContext fulfills
 * for /post and FeedContext for /home-new.
 *
 * The cache lives in a useRef<Map> (NOT useState): mutating it must not cause
 * re-renders. useSearch lazy-inits from here: the first render
 * already paints the cached results → the document recovers its full height →
 * the browser restores the scroll NATIVELY on POP (ScrollToTop doesn't
 * interfere on POP).
 */
const SearchCacheContext = createContext(null);

// Simple cap (FIFO eviction of the oldest): preserves recent searches
// without growing unbounded.
const MAX_CACHED = 12;

export function SearchCacheProvider({ children }) {
  const cacheRef = useRef(new Map());

  const getCached = useCallback((key) => {
    if (!key) return null;
    return cacheRef.current.get(key) || null;
  }, []);

  // Partial merge: keeps previous fields when updating only some.
  const setCached = useCallback((key, data) => {
    if (!key) return;
    const cache = cacheRef.current;
    const prev = cache.get(key);
    cache.set(key, { ...prev, ...data });
    if (!prev && cache.size > MAX_CACHED) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
  }, []);

  // (Scroll is handled by ScrollToTop's global scroll manager, by
  // location.key — this cache only preserves data.)
  return (
    <SearchCacheContext.Provider value={{ getCached, setCached }}>
      {children}
    </SearchCacheContext.Provider>
  );
}

export function useSearchCache() {
  const ctx = useContext(SearchCacheContext);
  if (!ctx) {
    throw new Error("useSearchCache must be used within a SearchCacheProvider");
  }
  return ctx;
}
