import { createContext, useContext, useRef, useCallback } from "react";

/**
 * Cache global de threads por threadId, para preservar estado y scroll al
 * volver (back/POP) a un /post/:id ya visitado — el mismo objetivo que
 * FeedContext cumple para /home-new, pero indexado por thread.
 *
 * El cache vive en un useRef<Map> (NO useState): mutarlo no debe causar
 * re-renders. Quien consume el cache (useThread) decide cuándo leer/escribir.
 *
 * Forma de cada entrada:
 *   { thread, replies, hasMore, nextUrl, scrollY }
 */
const ThreadCacheContext = createContext(null);

// Tope simple del cache (eviction FIFO del más antiguo). Preserva los threads
// recientes sin crecer sin límite; 12 cubre de sobra el patrón ir-y-volver.
const MAX_CACHED = 12;

export function ThreadCacheProvider({ children }) {
  const cacheRef = useRef(new Map());

  const getCachedThread = useCallback((id) => {
    if (!id) return null;
    return cacheRef.current.get(id) || null;
  }, []);

  // Merge parcial: conserva los campos previos (ej. scrollY) al actualizar
  // solo thread/replies. Evict del más antiguo al exceder el tope.
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
