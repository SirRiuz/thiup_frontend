import { createContext, useContext, useRef, useCallback } from "react";

/**
 * Cache global del estado de /search-new por clave de búsqueda ('q:<query>'
 * para el modo query, 't:<tag>' para el modo tag), para preservar resultados,
 * tab/sort activos y scroll al volver atrás (POP) — el mismo patrón que
 * ThreadCacheContext cumple para /post y FeedContext para /home-new.
 *
 * El cache vive en un useRef<Map> (NO useState): mutarlo no debe causar
 * re-renders. useSearch/useTagPosts hacen lazy-init desde aquí: el primer
 * render ya pinta los resultados cacheados → el documento recupera su altura
 * completa → el browser restaura el scroll de forma NATIVA en POP
 * (ScrollToTop no interfiere en POP).
 */
const SearchCacheContext = createContext(null);

// Tope simple (eviction FIFO del más antiguo): preserva las búsquedas
// recientes sin crecer sin límite.
const MAX_CACHED = 12;

export function SearchCacheProvider({ children }) {
  const cacheRef = useRef(new Map());

  const getCached = useCallback((key) => {
    if (!key) return null;
    return cacheRef.current.get(key) || null;
  }, []);

  // Merge parcial: conserva campos previos al actualizar solo algunos.
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

  // (El scroll lo maneja el scroll manager global de ScrollToTop, por
  // location.key — este cache solo preserva datos.)
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
