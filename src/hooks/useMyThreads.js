import { useState, useEffect, useCallback, useRef } from "react";
import { fetchMyThreads } from "../api/threadApi";
import { fetchSearchNext } from "../api/searchApi";
import { mapBackendPostToFrontend } from "../api/mappers/postMapper";

/**
 * State management for /me (My threads): the threads created by the
 * AUTHENTICATED user (server-side scope via request.mask — the hook doesn't
 * handle any user identifier).
 *
 * A simplified version of the useSearch pattern (no tab, no sort):
 *   - requestIdRef: only the most recent request writes state (no races
 *     between the StrictMode mount and a refetch).
 *   - pagination with DRF's `next` URL (fetchSearchNext follows it as-is,
 *     with dedupe by id when concatenating).
 *   - MODULE-level CACHE (survives unmount): on returning to the
 *     screen, the list (including the pages already loaded) is restored
 *     WITHOUT refetch or skeletons — the scroll manager can restore the
 *     position because the height exists immediately. `refetch` (error
 *     retry) does force fresh data.
 *   - FRESHNESS: when a thread is created, FeedContext.createPost prepends it
 *     to this cache (prependToMyThreadsCache) — it shows up in My threads
 *     instantly, with no extra requests.
 */

// Session cache: { posts, totalCount, nextUrl } — in memory only.
let myThreadsCache = null;

/**
 * Freshness when CREATING a thread (mirror of FeedContext.createPost's prepend):
 * the just-created thread belongs to the user by definition → it's prepended to
 * the cache so My threads shows it on return, without any extra request. If the
 * cache doesn't exist yet (screen never visited), no-op: the first visit will
 * fetch and the server already includes it.
 */
export function prependToMyThreadsCache(post) {
  if (!myThreadsCache || !post) return;
  if (myThreadsCache.posts.some((p) => p.id === post.id)) return;
  myThreadsCache = {
    ...myThreadsCache,
    posts: [post, ...myThreadsCache.posts],
    totalCount: myThreadsCache.totalCount + 1,
  };
}

/**
 * Patches the media of a cached thread once its upload is confirmed, so the
 * just-created thread shows its media in My threads without a reload (same
 * optimistic fix as the home feed).
 */
export function patchMyThreadsCacheMedia(uid, media) {
  if (!myThreadsCache || !uid || !media || media.length === 0) return;
  myThreadsCache = {
    ...myThreadsCache,
    posts: myThreadsCache.posts.map((p) =>
      p.uid === uid || p.id === uid ? { ...p, media } : p
    ),
  };
}

export function useMyThreads() {
  const [posts, setPosts] = useState(() => myThreadsCache?.posts || []);
  const [totalCount, setTotalCount] = useState(
    () => myThreadsCache?.totalCount ?? 0
  );
  const [isLoading, setIsLoading] = useState(() => !myThreadsCache);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [hasMore, setHasMore] = useState(() =>
    Boolean(myThreadsCache?.nextUrl)
  );
  const [refetchKey, setRefetchKey] = useState(0);

  const nextUrlRef = useRef(myThreadsCache?.nextUrl || null);
  const requestIdRef = useRef(0);
  // true when the current state is already valid (cache restored or fetch
  // completed) — governs the mount cache-hit and the sync to the cache.
  const satisfiedRef = useRef(Boolean(myThreadsCache));

  useEffect(() => {
    // CACHE HIT on mount: the lazy-init state is already the cached list
    // → don't fetch. An explicit refetch (retry) does bypass this.
    if (refetchKey === 0 && satisfiedRef.current) return undefined;

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();

    async function run() {
      setIsLoading(true);
      setError(null);
      setLoadMoreError(null);
      try {
        const data = await fetchMyThreads({ signal: controller.signal });
        if (requestId !== requestIdRef.current) return;
        setPosts((data.results || []).map(mapBackendPostToFrontend));
        setTotalCount(data.count ?? (data.results || []).length);
        nextUrlRef.current = data.next || null;
        setHasMore(Boolean(data.next));
        satisfiedRef.current = true;
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err && err.name === "AbortError") return;
        setError(err);
        setPosts([]);
        setTotalCount(0);
        setHasMore(false);
        nextUrlRef.current = null;
        satisfiedRef.current = false;
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [refetchKey]);

  // Sync to the cache (single write point): only VALID state — an
  // error doesn't overwrite a good cached list.
  useEffect(() => {
    if (!satisfiedRef.current) return;
    myThreadsCache = {
      posts,
      totalCount,
      nextUrl: nextUrlRef.current,
    };
  }, [posts, totalCount, hasMore]);

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

  return {
    posts,
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
