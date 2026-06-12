import { createContext, useContext, useRef, useCallback } from "react";

/**
 * Global cache of threads by threadId, to preserve state and scroll on
 * returning (back/POP) to an already-visited /post/:id — the same goal that
 * FeedContext fulfills for /home-new, but indexed by thread.
 *
 * The cache lives in a useRef<Map> (NOT useState): mutating it must not cause
 * re-renders. The cache's consumer (useThread) decides when to read/write.
 *
 * Shape of each entry:
 *   { thread, replies, hasMore, nextUrl, scrollY }
 */
const ThreadCacheContext = createContext(null);

// Simple cache cap (FIFO eviction of the oldest). Preserves recent threads
// without growing unbounded; 12 amply covers the go-and-return pattern.
const MAX_CACHED = 12;

export function ThreadCacheProvider({ children }) {
  const cacheRef = useRef(new Map());

  const getCachedThread = useCallback((id) => {
    if (!id) return null;
    return cacheRef.current.get(id) || null;
  }, []);

  // Partial merge: keeps the previous fields (e.g. scrollY) when updating
  // only thread/replies. Evicts the oldest when exceeding the cap.
  const setCachedThread = useCallback((id, data) => {
    if (!id) return;
    const cache = cacheRef.current;
    const prev = cache.get(id);
    cache.set(id, { ...prev, ...data });
    if (!prev && cache.size > MAX_CACHED) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
  }, []);

  const saveScrollPosition = useCallback((id, scrollY) => {
    if (!id) return;
    const entry = cacheRef.current.get(id);
    if (entry) entry.scrollY = scrollY;
  }, []);

  const getScrollPosition = useCallback((id) => {
    const entry = cacheRef.current.get(id);
    return entry ? entry.scrollY : undefined;
  }, []);

  const value = {
    getCachedThread,
    setCachedThread,
    saveScrollPosition,
    getScrollPosition,
  };

  return (
    <ThreadCacheContext.Provider value={value}>
      {children}
    </ThreadCacheContext.Provider>
  );
}

export function useThreadCache() {
  const ctx = useContext(ThreadCacheContext);
  if (!ctx) {
    throw new Error("useThreadCache must be used within a ThreadCacheProvider");
  }
  return ctx;
}
