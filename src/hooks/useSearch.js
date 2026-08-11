import { useState, useEffect, useCallback, useRef } from "react";
import { fetchSearch, fetchSearchNext } from "../api/searchApi";
import { mapBackendPostToFrontend } from "../api/mappers/postMapper";
import {
  mapBackendTagToFrontend,
  mapBackendUserToFrontend,
  mapBackendMediaToFrontend,
} from "../api/mappers/searchMapper";
import { useSearchCache } from "../contexts/SearchCacheContext";

/**
 * State management for the search screen (Twitter/X model: a single fixed tab
 * row). The tab is the SOURCE OF TRUTH driven by the URL (?tab=) and passed in;
 * this hook only fetches the results for the current (query, tab).
 *
 *   top    → posts ordered by precomputed MOMENTUM (-momentum_score)
 *   latest → posts ordered chronologically (-create_at)
 *   people → users
 *   tags   → hashtags matching the query
 *   media  → gallery of the files of matching threads (backend order:
 *            parent momentum, files in upload order — no ordering param)
 *
 * 'top' and 'latest' are the SAME post search in two orders — sort is no longer
 * a separate control, it's expressed as the two post tabs.
 *
 * Patterns kept from before: requestIdRef (only the most recent request writes
 * state / clears isLoading — no races on quick query/tab changes); cache busting
 * + pagination via searchApi; differentiated loading (empty => skeletons in the
 * screen, present => dim on tab change); POP restoration from SearchCacheContext
 * (lazy-init so the back navigation paints instantly, no re-fetch).
 */

// Tab → backend params.
const TYPE_OF = {
  top: "posts",
  latest: "posts",
  people: "users",
  tags: "tags",
  media: "media",
};
const ORDERING_OF = { top: "-momentum_score", latest: "-create_at" };

// Results mapper per tab.
const MAPPERS = {
  top: mapBackendPostToFrontend,
  latest: mapBackendPostToFrontend,
  people: mapBackendUserToFrontend,
  tags: mapBackendTagToFrontend,
  media: mapBackendMediaToFrontend,
};

// Identity key per tab (dedupe in loadMore, like the feed).
const KEY_OF = {
  top: (p) => p.id,
  latest: (p) => p.id,
  people: (u) => u.maskId,
  tags: (t) => t.name,
  media: (m) => m.id,
};

export function useSearch(query, tab) {
  const { getCached, setCached } = useSearchCache();

  const trimmed = (query || "").trim();
  const activeTab = TYPE_OF[tab] ? tab : "top";
  // Cache per (query, tab): each tab's results restore independently —
  // on POP (back/forward) AND on plain tab switches within the session.
  const cacheKey = trimmed ? `q:${trimmed}|${activeTab}` : null;

  // Snapshot of the cache ONCE on mount (lazy): a POP back paints immediately.
  const [initialCache] = useState(() =>
    cacheKey ? getCached(cacheKey) : null
  );

  const [results, setResults] = useState(() => initialCache?.results || []);
  // Tab the current `results` belong to. The screen renders by this (not the
  // active tab) so a tab change never mixes shapes (posts vs users vs tags)
  // during the in-flight fetch.
  const [loadedTab, setLoadedTab] = useState(() =>
    initialCache ? activeTab : null
  );
  // Counts of the 4 result types ({ posts, tags, users, media }) for the
  // per-tab badges. GLOBAL to the query (every response carries all), so they
  // survive a tab change without flicker. `countsFor` ties them to the query
  // that produced them: a NEW query invalidates them (badges hide) until its
  // first response — never a stale or placeholder number.
  const [counts, setCounts] = useState(() => initialCache?.counts || null);
  const [countsFor, setCountsFor] = useState(() =>
    initialCache ? trimmed : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [hasMore, setHasMore] = useState(() => Boolean(initialCache?.nextUrl));
  const [refetchKey, setRefetchKey] = useState(0);

  const nextUrlRef = useRef(initialCache?.nextUrl || null);
  // Same pattern as FeedContext: only the highest (most recent) id writes state.
  const requestIdRef = useRef(0);

  // Key (query|tab|refetchKey) the current state already satisfies (cache
  // lazy-init or a prior successful fetch): if it matches, no re-fetch on mount.
  const satisfiedKeyRef = useRef(
    initialCache ? `${trimmed}|${activeTab}|0` : null
  );

  // Reason for each run: navigation (query/tab change) vs forced refetch.
  const lastRunNavKeyRef = useRef(`${trimmed}|${activeTab}`);
  const lastRunRefetchKeyRef = useRef(0);

  // First-page fetch: runs when query, tab or refetchKey changes.
  useEffect(() => {
    const navKey = `${trimmed}|${activeTab}`;
    const navChanged = navKey !== lastRunNavKeyRef.current;
    const refetchForced = refetchKey !== lastRunRefetchKeyRef.current;
    lastRunNavKeyRef.current = navKey;
    lastRunRefetchKeyRef.current = refetchKey;

    if (!trimmed) {
      requestIdRef.current += 1;
      satisfiedKeyRef.current = null;
      setResults([]);
      setLoadedTab(null);
      setCounts(null);
      setCountsFor(null);
      setHasMore(false);
      setError(null);
      setLoadMoreError(null);
      nextUrlRef.current = null;
      return undefined;
    }

    // STATE HIT: the current state is already that of this key.
    const runKey = `${trimmed}|${activeTab}|${refetchKey}`;
    if (satisfiedKeyRef.current === runKey) return undefined;

    // CACHE HIT on ANY return to an already-loaded query|tab (tab switches
    // included — bouncing Top→People→Top must not refetch; the session cache
    // answers, same philosophy as the thread/feed caches): full restoration
    // without a fetch. Only refetch() (explicit retry) forces the network.
    if (navChanged && !refetchForced) {
      const cached = getCached(cacheKey);
      if (cached && cached.results) {
        requestIdRef.current += 1; // invalidates any in-flight fetch
        setResults(cached.results);
        setLoadedTab(activeTab);
        setCounts(cached.counts || null);
        setCountsFor(trimmed);
        nextUrlRef.current = cached.nextUrl || null;
        setHasMore(Boolean(cached.nextUrl));
        setError(null);
        setLoadMoreError(null);
        setIsLoading(false);
        satisfiedKeyRef.current = runKey;
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
          // Same query for every tab so the backend's counts (computed per
          // request from `q`) stay consistent across tabs. The leading '#' is
          // normalized for TAG matching on the backend (tags are stored
          // without '#'), so '#dns' and 'dns' find the same tag and yield the
          // same tags count — without varying the query per tab.
          query: trimmed,
          type: TYPE_OF[activeTab],
          ordering: ORDERING_OF[activeTab],
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        const mapper = MAPPERS[activeTab];
        setResults((data.results || []).map(mapper));
        setLoadedTab(activeTab);
        if (data.counts) {
          setCounts({
            posts: data.counts.posts ?? 0,
            tags: data.counts.tags ?? 0,
            users: data.counts.users ?? 0,
            media: data.counts.media ?? 0,
          });
          setCountsFor(trimmed);
        }
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
    // getCached/cacheKey are only read inside the guards; the
    // effect's real triggers are query, tab and refetchKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, activeTab, refetchKey]);

  // Sync to the cache (single write point): persist the loaded tab's state so a
  // POP back restores it completely (pagination included).
  useEffect(() => {
    if (!cacheKey || loadedTab !== activeTab) return;
    setCached(cacheKey, {
      results,
      counts,
      nextUrl: nextUrlRef.current,
    });
  }, [cacheKey, activeTab, loadedTab, results, counts, hasMore, setCached]);

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

  // Patches a post's fields in place after a successful edit — mirrors
  // FeedContext.patchPostInFeed for this screen's own local state (the
  // topReply branch matters here too: search's "top"/"latest" post cards
  // carry the same conversation-preview nesting Home's do). The existing
  // results→cache sync effect above picks up the change automatically —
  // no separate cache write needed here.
  const patchResult = useCallback((uid, patch) => {
    if (!uid || !patch) return;
    setResults((prev) =>
      prev.map((p) => {
        if (p.uid === uid || p.id === uid) return { ...p, ...patch };
        if (p.topReply && (p.topReply.uid === uid || p.topReply.id === uid)) {
          return { ...p, topReply: { ...p.topReply, ...patch } };
        }
        return p;
      })
    );
  }, []);

  // Expose counts ONLY when they belong to the current query — during a new
  // query's load they're stale, so the screen hides the badges.
  const currentCounts =
    trimmed && countsFor === trimmed ? counts : null;

  return {
    loadedTab,
    results,
    counts: currentCounts,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    refetch,
    patchResult,
  };
}
