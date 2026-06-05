import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigationType } from "react-router-dom";
import { fetchPostsByTag, fetchSearchNext } from "../api/searchApi";
import { mapBackendPostToFrontend } from "../api/mappers/postMapper";
import { useSearchCache } from "../contexts/SearchCacheContext";

/**
 * State management del modo TAG de /search-new: posts reales que tienen el
 * tag exacto (relación Thread-Tag en el backend, no icontains).
 *
 * Replica el patrón de FeedContext / useSearch:
 *   - requestIdRef: solo el request más reciente escribe state / apaga
 *     isLoading (sin race conditions al cambiar tag o sort rápido).
 *   - cache busting (&_t) vía searchApi; paginación con la next URL de DRF.
 *   - loading diferenciado: posts vacíos => skeletons; con posts (cambio de
 *     sort) => dim. selectSort SIEMPRE bumpea refetchKey (re-click incluido).
 *
 * Preservación al volver (POP), patrón ThreadCacheContext: lazy-init desde
 * SearchCacheContext ('t:<tag>') → el primer render pinta los posts cacheados
 * (sin re-fetch, sort preservado) y el browser restaura el scroll nativo.
 */

// Mismo mapping sort → ordering DRF que el feed y el thread.
const ORDERING_BY_SORT = {
  trending: "-reactions_count",
  newest: "-create_at",
  oldest: "create_at",
};

export function useTagPosts(tag) {
  const { getCached, setCached } = useSearchCache();
  // POP (back a un tag ya visitado sin remount) => restaurar del cache;
  // PUSH/REPLACE (tag nuevo / búsqueda fresca) => fetch.
  const navigationType = useNavigationType();

  // Normaliza el tag: sin '#' inicial ni espacios (el backend lowercasea).
  const normalizedTag = (tag || "").trim().replace(/^#/, "");
  const cacheKey = normalizedTag ? `t:${normalizedTag}` : null;

  // Snapshot del cache una sola vez al montar (POP back => render inmediato).
  const [initialCache] = useState(() =>
    cacheKey ? getCached(cacheKey) : null
  );

  const [sortBy, setSortBy] = useState(() => initialCache?.sortBy || "trending");
  const [posts, setPosts] = useState(() => initialCache?.posts || []);
  const [totalCount, setTotalCount] = useState(
    () => initialCache?.totalCount ?? 0
  );
  // Tag al que pertenece totalCount. Cambiar el SORT no lo invalida (el count
  // del tag es el mismo, solo cambia el orden) — sin parpadeo del 'N results'.
  const [countFor, setCountFor] = useState(() =>
    initialCache ? normalizedTag : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [hasMore, setHasMore] = useState(() => Boolean(initialCache?.nextUrl));
  const [refetchKey, setRefetchKey] = useState(0);

  const nextUrlRef = useRef(initialCache?.nextUrl || null);
  const requestIdRef = useRef(0);

  // Clave (tag|sort|refetchKey) ya satisfecha por el estado actual (cache en
  // POP back o fetch previo): si coincide, NO re-fetchea al montar.
  const satisfiedKeyRef = useRef(
    initialCache
      ? `${normalizedTag}|${initialCache.sortBy || "trending"}|0`
      : null
  );

  // Tag nuevo => búsqueda nueva: vuelve al sort default. Excepciones: el
  // primer run (montaje, sort del lazy-init) y un POP a un tag cacheado sin
  // remount (el fetch effect restaura el sort del cache).
  const isFirstTagRunRef = useRef(true);
  useEffect(() => {
    if (isFirstTagRunRef.current) {
      isFirstTagRunRef.current = false;
      return;
    }
    if (navigationType === "POP") {
      const cached = cacheKey ? getCached(cacheKey) : null;
      if (cached && cached.posts) return;
    }
    setSortBy("trending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  // Motivo de cada run: cambio de tag (navegación) vs sort/refetch.
  const lastRunTagRef = useRef(normalizedTag);
  const lastRunRefetchKeyRef = useRef(0);

  useEffect(() => {
    const tagChanged = normalizedTag !== lastRunTagRef.current;
    const refetchForced = refetchKey !== lastRunRefetchKeyRef.current;
    lastRunTagRef.current = normalizedTag;
    lastRunRefetchKeyRef.current = refetchKey;

    if (!normalizedTag) {
      requestIdRef.current += 1;
      satisfiedKeyRef.current = null;
      setPosts([]);
      setTotalCount(0);
      setCountFor(null);
      setHasMore(false);
      setError(null);
      setLoadMoreError(null);
      nextUrlRef.current = null;
      return undefined;
    }

    // STATE HIT: el estado actual ya es el de esta clave.
    const runKey = `${normalizedTag}|${sortBy}|${refetchKey}`;
    if (satisfiedKeyRef.current === runKey) return undefined;

    // CACHE HIT en POP SIN remount (query → back a un tag visitado, etc.):
    // restauración completa (posts, count, sort) sin fetch. Solo cambios de
    // TAG por navegación POP — sort, refetch y tags nuevos sí fetchean.
    if (tagChanged && !refetchForced && navigationType === "POP") {
      const cached = getCached(cacheKey);
      if (cached && cached.posts) {
        const restoredSort = cached.sortBy || "trending";
        requestIdRef.current += 1; // invalida cualquier fetch en vuelo
        setSortBy(restoredSort);
        setPosts(cached.posts);
        setTotalCount(cached.totalCount ?? cached.posts.length);
        setCountFor(normalizedTag);
        nextUrlRef.current = cached.nextUrl || null;
        setHasMore(Boolean(cached.nextUrl));
        setError(null);
        setLoadMoreError(null);
        setIsLoading(false);
        satisfiedKeyRef.current = `${normalizedTag}|${restoredSort}|${refetchKey}`;
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
        const data = await fetchPostsByTag({
          tag: normalizedTag,
          ordering: ORDERING_BY_SORT[sortBy] || "-create_at",
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        setPosts((data.results || []).map(mapBackendPostToFrontend));
        setTotalCount(data.count ?? (data.results || []).length);
        setCountFor(normalizedTag);
        nextUrlRef.current = data.next || null;
        setHasMore(Boolean(data.next));
        satisfiedKeyRef.current = runKey;
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err && err.name === "AbortError") return;
        setError(err);
        setPosts([]);
        setTotalCount(0);
        setHasMore(false);
        nextUrlRef.current = null;
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }

    run();
    return () => controller.abort();
    // navigationType/getCached/cacheKey solo se leen dentro de los guards;
    // los triggers reales del effect son tag, sort y refetchKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedTag, sortBy, refetchKey]);

  // Sync al cache (un solo punto de escritura): persiste el estado del tag
  // actual para que el POP back lo restaure completo (incluida paginación).
  useEffect(() => {
    if (!cacheKey || countFor !== normalizedTag) return;
    setCached(cacheKey, {
      posts,
      totalCount,
      sortBy,
      nextUrl: nextUrlRef.current,
    });
  }, [cacheKey, normalizedTag, countFor, posts, totalCount, sortBy, hasMore, setCached]);

  // SIEMPRE bumpea refetchKey (igual que FeedContext.selectSort): garantiza
  // fetch fresco incluso al re-clickear el sort activo.
  const selectSort = useCallback((newSort) => {
    setSortBy(newSort);
    setRefetchKey((k) => k + 1);
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextUrlRef.current || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      const data = await fetchSearchNext(nextUrlRef.current);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const additions = (data.results || [])
          .map(mapBackendPostToFrontend)
          .filter((p) => !seen.has(p.id));
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
  }, [isLoadingMore, isLoading]);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  const countReady = Boolean(normalizedTag) && countFor === normalizedTag;

  return {
    sortBy,
    selectSort,
    posts,
    totalCount,
    countReady,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    refetch,
  };
}
