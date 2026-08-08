import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSearch, fetchSearchNext } from "../api/searchApi";
import { mapBackendPostToFrontend } from "../api/mappers/postMapper";

// SESSION cache (module-level, same pattern as the thread cache / trending
// suggestions / search tabs): one entry per mask — leaving the profile and
// coming back restores instantly with NO request. FIFO-capped.
const anonThreadsCache = new Map(); // maskId -> { posts, nextUrl }
const MAX_CACHED_MASKS = 20;

function cacheSet(maskId, value) {
  if (anonThreadsCache.has(maskId)) anonThreadsCache.delete(maskId);
  anonThreadsCache.set(maskId, value);
  if (anonThreadsCache.size > MAX_CACHED_MASKS) {
    anonThreadsCache.delete(anonThreadsCache.keys().next().value);
  }
}

/**
 * useAnonThreads — the public threads of one anonymous mask (/m/:maskId).
 *
 * Zero new backend surface: it rides the search's author filter (`@<public
 * id>` resolves the mask via the hash-prefix index and lists that author's
 * root threads), newest first, with the search's own pagination (next URL).
 * The mask id is PUBLIC by design (it's on every card), so this leaks
 * nothing the feed doesn't already show. Results are session-cached per
 * mask (pagination included) — revisits render instantly, request-free.
 */
export function useAnonThreads(maskId) {
  const initialCache = maskId ? anonThreadsCache.get(maskId) : null;
  const [posts, setPosts] = useState(() => initialCache?.posts || []);
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [hasMore, setHasMore] = useState(Boolean(initialCache?.nextUrl));
  const nextUrlRef = useRef(initialCache?.nextUrl || null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!maskId) {
      setPosts([]);
      setIsLoading(false);
      return undefined;
    }
    // CACHE HIT — restore (posts + pagination cursor) and skip the request.
    const cached = anonThreadsCache.get(maskId);
    if (cached) {
      setPosts(cached.posts);
      nextUrlRef.current = cached.nextUrl || null;
      setHasMore(Boolean(cached.nextUrl));
      setIsLoading(false);
      setError(null);
      setLoadMoreError(null);
      return undefined;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setLoadMoreError(null);
    fetchSearch({
      query: `@${maskId}`,
      type: "posts",
      ordering: "-create_at",
      signal: controller.signal,
    })
      .then((data) => {
        if (requestId !== requestIdRef.current) return;
        const mapped = (data.results || []).map(mapBackendPostToFrontend);
        setPosts(mapped);
        nextUrlRef.current = data.next || null;
        setHasMore(Boolean(data.next));
        setIsLoading(false);
        cacheSet(maskId, { posts: mapped, nextUrl: data.next || null });
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        if (err && err.name === "AbortError") return;
        setError(err);
        setPosts([]);
        setHasMore(false);
        nextUrlRef.current = null;
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [maskId]);

  const loadMore = useCallback(async () => {
    const nextUrl = nextUrlRef.current;
    if (!nextUrl) return;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const data = await fetchSearchNext(nextUrl);
      const mapped = (data.results || []).map(mapBackendPostToFrontend);
      nextUrlRef.current = data.next || null;
      setHasMore(Boolean(data.next));
      setPosts((prev) => {
        const merged = [...prev, ...mapped];
        // Keep the cache in step with pagination (revisits restore the
        // whole loaded list, not just page 1).
        if (maskId) {
          cacheSet(maskId, { posts: merged, nextUrl: data.next || null });
        }
        return merged;
      });
    } catch (err) {
      setLoadMoreError(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [maskId]);

  // Patches a post's fields in place after a successful edit — mirrors
  // FeedContext.patchPostInFeed/useSearch.patchResult for this screen's own
  // local state (module-level cache included, same pattern loadMore already
  // uses to keep it in step). The topReply branch matters here too: this
  // profile's post cards carry the same conversation-preview nesting
  // Home/search do (see CLAUDE.md — every feed surface, incl. /m/:maskId).
  const patchPost = useCallback(
    (uid, patch) => {
      if (!uid || !patch) return;
      setPosts((prev) => {
        const next = prev.map((p) => {
          if (p.uid === uid || p.id === uid) return { ...p, ...patch };
          if (p.topReply && (p.topReply.uid === uid || p.topReply.id === uid)) {
            return { ...p, topReply: { ...p.topReply, ...patch } };
          }
          return p;
        });
        if (maskId) cacheSet(maskId, { posts: next, nextUrl: nextUrlRef.current });
        return next;
      });
    },
    [maskId]
  );

  const refetch = useCallback(() => {
    if (!maskId) return;
    // Explicit retry bypasses (and then refreshes) the cache.
    anonThreadsCache.delete(maskId);
    requestIdRef.current += 1;
    setPosts([]);
    setIsLoading(true);
    setError(null);
    fetchSearch({
      query: `@${maskId}`,
      type: "posts",
      ordering: "-create_at",
    })
      .then((data) => {
        const mapped = (data.results || []).map(mapBackendPostToFrontend);
        setPosts(mapped);
        nextUrlRef.current = data.next || null;
        setHasMore(Boolean(data.next));
        setIsLoading(false);
        cacheSet(maskId, { posts: mapped, nextUrl: data.next || null });
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [maskId]);

  return {
    posts,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    refetch,
    patchPost,
  };
}
