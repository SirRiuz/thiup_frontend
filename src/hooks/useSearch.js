import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigationType } from "react-router-dom";
import { fetchSearch, fetchSearchNext } from "../api/searchApi";
import { mapBackendPostToFrontend } from "../api/mappers/postMapper";
import {
  mapBackendTagToFrontend,
  mapBackendUserToFrontend,
} from "../api/mappers/searchMapper";
import { useSearchCache } from "../contexts/SearchCacheContext";

/**
 * State management de la búsqueda por query. Replica el patrón de FeedContext:
 *   - requestIdRef: solo el request más reciente actualiza state / apaga
 *     isLoading (evita race conditions al cambiar query o tab rápido).
 *   - cache busting (&_t) y paginación (next URL) vía searchApi.
 *   - loading diferenciado: isLoading + results vacíos => skeletons (lo decide
 *     la pantalla); isLoading + results presentes => dim (cambio de tab).
 *
 * Preservación al volver (POP), patrón ThreadCacheContext: el estado se
 * lazy-inicializa desde SearchCacheContext, así el primer render ya pinta los
 * resultados (sin re-fetch) y el documento recupera su altura → el browser
 * restaura el scroll de forma nativa (ScrollToTop no interfiere en POP).
 *
 * Un solo endpoint devuelve los counts de los 3 tipos + los resultados del tab
 * activo, así que las tabs muestran sus counts sin llamadas extra.
 */

const EMPTY_COUNTS = { posts: 0, tags: 0, users: 0 };

// Mapper de resultados por tab.
const MAPPERS = {
  posts: mapBackendPostToFrontend,
  tags: mapBackendTagToFrontend,
  users: mapBackendUserToFrontend,
};

// Clave de identidad por tab (para dedupe en loadMore, como hace el feed).
const KEY_OF = {
  posts: (p) => p.id,
  tags: (t) => t.name,
  users: (u) => u.maskId,
};

function normalizeCounts(counts) {
  if (!counts) return EMPTY_COUNTS;
  return {
    posts: counts.posts ?? 0,
    tags: counts.tags ?? 0,
    users: counts.users ?? 0,
  };
}

export function useSearch(query) {
  const { getCached, setCached } = useSearchCache();
  // Para distinguir POP (back/forward: restaurar del cache) de PUSH/REPLACE
  // (búsqueda fresca: fetch) cuando la query cambia SIN remount (la pantalla
  // /search-new queda montada al navegar query↔tag).
  const navigationType = useNavigationType();

  const trimmed = (query || "").trim();
  const cacheKey = trimmed ? `q:${trimmed}` : null;

  // Snapshot del cache UNA sola vez al montar (lazy): si volvemos (POP) a una
  // búsqueda ya hecha, el primer render sale con los resultados cacheados.
  const [initialCache] = useState(() =>
    cacheKey ? getCached(cacheKey) : null
  );

  const [activeTab, setActiveTab] = useState(
    () => initialCache?.activeTab || "posts"
  );
  // Tab al que pertenecen los `results` actuales. Puede diferir de activeTab
  // durante el cambio de tab: activeTab cambia al instante (highlight), pero
  // results sigue siendo del tab anterior hasta que llega el fetch nuevo. La
  // pantalla renderiza por loadedTab para no mezclar shapes (posts vs users).
  const [loadedTab, setLoadedTab] = useState(
    () => initialCache?.loadedTab || "posts"
  );
  const [results, setResults] = useState(() => initialCache?.results || []);
  const [counts, setCounts] = useState(
    () => initialCache?.counts || EMPTY_COUNTS
  );
  // Query al que pertenecen los counts actuales. Los counts son GLOBALES de
  // la query (no del tab): cambiar de tab NO los invalida — siguen visibles y
  // estables mientras llega el fetch del tab. Solo una query nueva los marca
  // como pendientes (countsReady=false) hasta su primera respuesta.
  const [countsFor, setCountsFor] = useState(() =>
    initialCache ? trimmed : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [hasMore, setHasMore] = useState(() =>
    Boolean(initialCache?.nextUrl)
  );
  const [refetchKey, setRefetchKey] = useState(0);

  const nextUrlRef = useRef(initialCache?.nextUrl || null);
  // Mismo patrón que FeedContext: contador incremental; solo el ID más alto
  // (el más reciente) escribe state y apaga isLoading.
  const requestIdRef = useRef(0);

  // Clave (query|tab|refetchKey) que el estado actual YA satisface — por el
  // lazy-init del cache (POP back) o por un fetch exitoso previo. Si el
  // effect corre para una clave ya satisfecha, NO re-fetchea (causa raíz del
  // re-fetch al volver atrás). Una query/tab nueva o refetch() cambia la
  // clave => fetch fresco.
  const satisfiedKeyRef = useRef(
    initialCache?.loadedTab
      ? `${trimmed}|${initialCache.loadedTab}|0`
      : null
  );

  // Al cambiar el query empezamos una búsqueda nueva: volvemos al tab posts.
  // Excepciones: (a) el primer run (montaje) — la tab viene del lazy-init del
  // cache; (b) un POP a una query cacheada SIN remount (tag → back a query) —
  // el fetch effect restaura la tab del cache, no hay que pisarla con posts.
  const isFirstQueryRunRef = useRef(true);
  useEffect(() => {
    if (isFirstQueryRunRef.current) {
      isFirstQueryRunRef.current = false;
      return;
    }
    if (navigationType === "POP") {
      const cached = cacheKey ? getCached(cacheKey) : null;
      if (cached && cached.loadedTab) return;
    }
    setActiveTab("posts");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Distinguen el MOTIVO de cada run del fetch effect: cambio de query
  // (navegación) vs cambio de tab (interacción) vs refetch forzado.
  const lastRunQueryRef = useRef(trimmed);
  const lastRunRefetchKeyRef = useRef(0);

  // Fetch de la primera página: corre al cambiar query, tab o refetchKey.
  useEffect(() => {
    const queryChanged = trimmed !== lastRunQueryRef.current;
    const refetchForced = refetchKey !== lastRunRefetchKeyRef.current;
    lastRunQueryRef.current = trimmed;
    lastRunRefetchKeyRef.current = refetchKey;

    if (!trimmed) {
      requestIdRef.current += 1;
      satisfiedKeyRef.current = null;
      setResults([]);
      setCounts(EMPTY_COUNTS);
      setCountsFor(null);
      setHasMore(false);
      setError(null);
      setLoadMoreError(null);
      nextUrlRef.current = null;
      return undefined;
    }

    // STATE HIT: el estado actual ya es el de esta clave (lazy-init del
    // montaje o run previo exitoso).
    const runKey = `${trimmed}|${activeTab}|${refetchKey}`;
    if (satisfiedKeyRef.current === runKey) return undefined;

    // CACHE HIT en POP SIN remount (query → tag → back: la pantalla quedó
    // montada, así que el lazy-init no corre). Si la query a la que volvemos
    // está cacheada, restauración COMPLETA (resultados, counts, tab) sin
    // fetch. Solo aplica a cambios de QUERY por navegación POP — un cambio
    // de tab, un refetch() o una búsqueda fresca (PUSH/REPLACE) sí fetchean.
    if (queryChanged && !refetchForced && navigationType === "POP") {
      const cached = getCached(cacheKey);
      if (cached && cached.loadedTab) {
        const restoredTab = cached.activeTab || cached.loadedTab;
        requestIdRef.current += 1; // invalida cualquier fetch en vuelo
        setActiveTab(restoredTab);
        setLoadedTab(cached.loadedTab);
        setResults(cached.results || []);
        setCounts(cached.counts || EMPTY_COUNTS);
        setCountsFor(trimmed);
        nextUrlRef.current = cached.nextUrl || null;
        setHasMore(Boolean(cached.nextUrl));
        setError(null);
        setLoadMoreError(null);
        setIsLoading(false);
        satisfiedKeyRef.current = `${trimmed}|${restoredTab}|${refetchKey}`;
        return undefined;
      }
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();

    async function run() {
      setIsLoading(true);
      setError(null);
      setLoadMoreError(null);
      try {
        const data = await fetchSearch({
          query: trimmed,
          type: activeTab,
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        const mapper = MAPPERS[activeTab];
        setResults((data.results || []).map(mapper));
        setLoadedTab(activeTab);
        setCounts(normalizeCounts(data.counts));
        setCountsFor(trimmed);
        nextUrlRef.current = data.next || null;
        setHasMore(Boolean(data.next));
        satisfiedKeyRef.current = runKey;
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err && err.name === "AbortError") return;
        setError(err);
        setResults([]);
        setHasMore(false);
        nextUrlRef.current = null;
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }

    run();
    return () => controller.abort();
    // navigationType/getCached/cacheKey solo se leen dentro de los guards;
    // los triggers reales del effect son query, tab y refetchKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, activeTab, refetchKey]);

  // Sync al cache (un solo punto de escritura, como useThread): cada vez que
  // el estado pertenece a la query actual (countsFor === trimmed), persistirlo
  // para que el POP back lo restaure completo (incluida la paginación).
  useEffect(() => {
    if (!cacheKey || countsFor !== trimmed) return;
    setCached(cacheKey, {
      results,
      counts,
      activeTab,
      loadedTab,
      nextUrl: nextUrlRef.current,
    });
  }, [
    cacheKey,
    trimmed,
    countsFor,
    results,
    counts,
    activeTab,
    loadedTab,
    hasMore,
    setCached,
  ]);

  // Cambia de tab => refetchea los resultados de ese tab (con loading => dim,
  // los results del tab anterior se mantienen mientras carga, como el feed).
  const selectTab = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextUrlRef.current || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    const mapper = MAPPERS[activeTab];
    const keyOf = KEY_OF[activeTab];
    try {
      const data = await fetchSearchNext(nextUrlRef.current);
      setResults((prev) => {
        const seen = new Set(prev.map(keyOf));
        const additions = (data.results || [])
          .map(mapper)
          .filter((item) => !seen.has(keyOf(item)));
        return [...prev, ...additions];
      });
      nextUrlRef.current = data.next || null;
      setHasMore(Boolean(data.next));
      setLoadMoreError(null);
    } catch (err) {
      setLoadMoreError(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeTab, isLoadingMore, isLoading]);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  const totalCount = counts.posts + counts.tags + counts.users;
  // true cuando los counts pertenecen a la query actual: cambiar de tab no lo
  // apaga (counts estables, sin parpadeo); una query nueva sí, hasta cargar.
  const countsReady = Boolean(trimmed) && countsFor === trimmed;

  return {
    activeTab,
    loadedTab,
    selectTab,
    results,
    counts,
    countsReady,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    refetch,
  };
}
