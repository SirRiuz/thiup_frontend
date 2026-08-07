import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

import {
  getThreadById,
  getThreadReplies,
  createReply as createReplyRequest,
} from "../api/threadApi";
import { getReactions, createReaction } from "../api/reactionApi";
import {
  mapBackendThreadToFrontend,
  mapBackendRepliesToFrontend,
  mapBackendReplyToFrontend,
} from "../api/mappers/threadMapper";
import { toggleReaction as applyToggle } from "../components/post/reactionUtils";
import {
  addInteraction,
  extractTags,
  tagsForContent,
  AFFINITY_WEIGHTS,
} from "../utils/affinity";
import { useThreadCache } from "../contexts/ThreadCacheContext";
import { buildDraftJsContent } from "../utils/draftjs";

/**
 * Resolves the backend id of the clicked reaction type. The picker uses
 * semantic ids ("fire", "seen", …), but POST /reactions/ needs the real id.
 *   1. If the emoji is already on the post, its reaction carries the backend id.
 *   2. Otherwise, we look it up in the catalog (/reactions/) by emoji or by name.
 * Returns null if it can't be resolved (no catalog and a new emoji).
 */
function resolveReactionId(clicked, post, catalog) {
  const onPost = (post.reactions || []).find(
    (r) => r.emoji === clicked.emoji && r.id != null && r.id !== clicked.id
  );
  if (onPost) return onPost.id;
  const cat = (catalog || []).find(
    (c) =>
      c.emoji === clicked.emoji ||
      c.name === clicked.id ||
      c.name === clicked.label
  );
  return cat ? cat.id : null;
}

/**
 * Encapsulates all the state of the /post/:id/ thread.
 *
 * It's a local hook (not a global Context like FeedContext) because each visit
 * to a thread is a fresh, independent fetch — there's nothing to persist
 * between navigations. But the internal anti-race pattern (requestIdRef), the
 * cache busting and the error handling are replicated exactly from FeedContext.
 *
 * @param {string} threadId  thread uid (from useParams).
 * @returns {{
 *   thread: object|null, replies: object[],
 *   isLoading: boolean, isSwitchingThread: boolean, isLoadingMore: boolean, loadMoreError: Error|null,
 *   isCreatingReply: boolean,
 *   createReplyError: Error|null, hasMore: boolean, error: Error|null,
 *   createReply: Function, loadMore: Function, retry: Function
 * }}
 */
// Maps the UI sort option to the backend's `ordering` query param.
// Same labels and mapping as FeedContext's buildOrderingParam (/home-new):
// trending/newest/oldest.
function buildReplyOrdering(sortBy) {
  switch (sortBy) {
    case "newest":
      return "-create_at";
    case "oldest":
      return "create_at";
    case "trending":
    default:
      return "-reactions_count";
  }
}

// Inserts a new reply at the correct position in the flat list (which is in
// DFS order: each parent followed by its subtree). A sub-reply is inserted
// AFTER its parent's full subtree → it gets grouped under it as the most
// recent sibling, NOT at the end of the whole thread. A top-level reply goes
// at the end (previous behavior). Handles arbitrary depth.
function insertReply(list, newReply) {
  const parentId = newReply.parentId;
  if (!parentId) return [...list, newReply];

  const parentIdx = list.findIndex((r) => r.id === parentId);
  if (parentIdx === -1) return [...list, newReply]; // defensive fallback

  // The parent's descendants are contiguous in DFS: we advance while the
  // next item hangs off some id already seen in the subtree.
  const subtree = new Set([parentId]);
  let insertAt = parentIdx + 1;
  while (insertAt < list.length && subtree.has(list[insertAt].parentId)) {
    subtree.add(list[insertAt].id);
    insertAt += 1;
  }
  return [...list.slice(0, insertAt), newReply, ...list.slice(insertAt)];
}

export function useThread(threadId, seedThread) {
  const { getCachedThread, setCachedThread } = useThreadCache();

  // Lazy init from the cache: if we return (POP) to an already-visited thread,
  // the content is present on the FIRST render. This is what lets the browser
  // restore the scroll natively (same as /home-new): if the content only
  // appeared in an effect, the body would have height 0 on the first paint and
  // the restoration would fail.
  const initialCache = getCachedThread(threadId);

  // SEED: navigating from a feed passes the already-loaded card post (router
  // state) — the SAME shape as the thread head (both come from
  // mapBackendPostToFrontend). It paints the OP instantly (no head skeleton;
  // only the replies still load). The cache wins over the seed (fresher), and
  // a hard reload has no router state → the normal full-skeleton flow.
  const seed =
    seedThread &&
    seedThread.id === threadId &&
    !(initialCache && initialCache.thread)
      ? {
          ...seedThread,
          replyCount: seedThread.replyCount ?? seedThread.repliesCount ?? 0,
        }
      : null;

  const [thread, setThread] = useState(
    () => initialCache?.thread || seed || null
  );
  const [replies, setReplies] = useState(() => initialCache?.replies || []);
  const [isLoading, setIsLoading] = useState(
    () => !(initialCache && initialCache.thread)
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Pagination failure (infinite scroll): while set, the sentinel stands down
  // and the UI shows a retry banner instead — without it a failing fetch
  // would re-trigger on every intersection (hammering loop). Cleared on the
  // next attempt and on any fresh initial fetch.
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [isCreatingReply, setIsCreatingReply] = useState(false);
  const [createReplyError, setCreateReplyError] = useState(null);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(() =>
    Boolean(initialCache?.hasMore)
  );
  const [refetchKey, setRefetchKey] = useState(0);

  // Replies sorting (trending/newest/oldest), same as FeedContext's selectSort.
  const [sortBy, setSortBy] = useState(
    () => initialCache?.sortBy || "trending"
  );
  // sortKey forces the refetch even when re-clicking the same option (same as
  // FeedContext's refetchKey). isReloadingReplies = sort reload with replies
  // already visible → dim, NOT skeletons.
  const [sortKey, setSortKey] = useState(0);
  const [isReloadingReplies, setIsReloadingReplies] = useState(false);
  // Same-instance navigation (ancestor-chain click, Post.js never remounts
  // between two /p/:id ids): true while `thread` shows a SEEDED head (its
  // real replies not fetched yet) instead of the true full-page skeleton or
  // a complete cache hit — see the hydration effect below. Post.js uses it
  // to show a quiet spinner in place of the reply skeletons for this one
  // case (everything else — full skeleton, load-more, sort-reload — keeps
  // its own existing indicator untouched).
  const [isSwitchingThread, setIsSwitchingThread] = useState(false);
  // Ref of the current sortBy: the fetch effect reads it without adding sortBy
  // to its deps (avoids a double trigger and stale closures). Marks whether the
  // effect's next run is a sort change (dim) vs a navigation/retry (skeleton +
  // cache).
  const sortByRef = useRef(sortBy);
  const isSortChangeRef = useRef(false);

  // DRF's next: a ref instead of state because it doesn't need to cause a re-render.
  const nextUrlRef = useRef(initialCache?.nextUrl || null);
  // Incremental anti-race counter: each initial fetch gets a unique id and only
  // the most recent one writes state / turns off isLoading. (Same as FeedContext.)
  const requestIdRef = useRef(0);
  // Catalog of reaction types (emoji ↔ backend id), loaded once.
  const reactionCatalogRef = useRef([]);
  // postIds with a reaction toggle in flight — anti double-click guard.
  const togglingRef = useRef(new Set());
  // Avoids writing state after unmount (the reaction POST's await is in progress).
  const isMountedRef = useRef(true);
  // Tracks the threadId this hook INSTANCE last hydrated for — initialized to
  // the mount value, so the hydration effect below can tell "this is the
  // component's true first render" (ref already matches, lazy useState
  // already handled it) apart from "threadId just changed on an existing
  // instance" (ref is stale). See the effect for why this distinction matters.
  const prevThreadIdRef = useRef(threadId);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Mirror of `replies` to read the current state outside the setState updaters
  // (createReply needs to locate the parent without putting `replies` in its
  // deps, which would recreate it on every change).
  const repliesRef = useRef(replies);
  useEffect(() => {
    repliesRef.current = replies;
  }, [replies]);

  // Tags of the ROOT thread (client-side affinity profile): a ref so the
  // callbacks (createReply, toggleReaction) read them without stale closures.
  // Reacting to / commenting on a reply also feeds the root thread's tags —
  // the interest signal is about the thread's topic.
  const threadTagsRef = useRef([]);
  useEffect(() => {
    threadTagsRef.current = thread ? extractTags(thread.text) : [];
  }, [thread]);

  // Whether the ROOT thread is the current user's (head.is_mine). A ref so
  // createReply reads it without a stale closure: a reply the user posts is OP
  // iff they authored the thread.
  const threadIsMineRef = useRef(false);
  useEffect(() => {
    threadIsMineRef.current = Boolean(thread?.isMine);
  }, [thread]);

  // Reactions catalog: a single load per hook mount. No aggressive cache
  // busting (it changes very rarely); silent failure (the reactions already
  // present on the post carry their backend id anyway).
  useEffect(() => {
    const controller = new AbortController();
    getReactions({ signal: controller.signal })
      .then((list) => {
        reactionCatalogRef.current = list || [];
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // === Same-instance navigation hydration (ancestor-chain clicks) =========
  // `thread`/`replies` are seeded via a LAZY useState initializer above,
  // which only runs on the component's true first mount. Post.js reuses the
  // SAME instance across two /p/:id ids (no remount — see its own scroll-
  // anchoring comments), so clicking a node in the ancestor chain used to
  // leave `thread` on the PREVIOUS thread's data — frozen, no seed, no
  // skeleton, nothing — until the real fetch below resolved. This effect is
  // the fix: it re-runs the SAME cache → seed → null priority as the lazy
  // initializer, but on every `threadId` change, not just the first one, and
  // as a LAYOUT effect so the correction lands in the SAME commit as the
  // navigation — before the browser paints, so the stale frame is never
  // actually shown (a setState from a layout effect flushes synchronously,
  // pre-paint). `prevThreadIdRef` distinguishes true first mount (ref
  // already equals threadId — the lazy initializer already did this job,
  // no-op here) from a genuine navigation (ref is stale — hydrate now).
  useLayoutEffect(() => {
    if (threadId === prevThreadIdRef.current) return;
    prevThreadIdRef.current = threadId;
    if (!threadId) return;

    const cached = getCachedThread(threadId);
    if (cached && cached.thread) {
      // Full, authoritative data already known (a previously-visited node
      // in this same session) — paint it complete, no spinner needed.
      setThread(cached.thread);
      setReplies(cached.replies || []);
      setHasMore(Boolean(cached.hasMore));
      nextUrlRef.current = cached.nextUrl || null;
      if (cached.sortBy) {
        setSortBy(cached.sortBy);
        sortByRef.current = cached.sortBy;
      }
      setError(null);
      setIsLoading(false);
      setIsSwitchingThread(false);
      return;
    }

    if (seedThread && seedThread.id === threadId) {
      // Ancestor-row click: the clicked node's own data (text, media, mask,
      // its own ancestors) is already known — it's the object Post.js was
      // already rendering in the chain. Paint it now; only the REAL replies
      // (and the authoritative thread) are still unknown, so isLoading stays
      // true and isSwitchingThread flags the "seeded, replies pending"
      // in-between state for the spinner.
      setThread({
        ...seedThread,
        replyCount: seedThread.replyCount ?? seedThread.repliesCount ?? 0,
      });
      setReplies([]);
      setHasMore(false);
      setError(null);
      setIsLoading(true);
      setIsSwitchingThread(true);
      return;
    }

    // No cache, no seed (e.g. some future same-instance navigation without
    // router state): nothing is known about the new thread — fall back to
    // the ordinary full-page skeleton, exactly like a fresh mount would.
    setThread(null);
    setReplies([]);
    setHasMore(false);
    setError(null);
    setIsLoading(true);
    setIsSwitchingThread(false);
  }, [threadId, seedThread, getCachedThread]);

  // Thread fetch — runs on mount, when threadId changes, on retry(), and when
  // the sort changes (selectSort bumps sortKey).
  useEffect(() => {
    if (!threadId) return undefined;

    // Is this run a sort change? (set by selectSort). We consume it here.
    const isSortChange = isSortChangeRef.current;
    isSortChangeRef.current = false;

    // CACHE HIT: already-visited thread → restore without re-fetch (root cause
    // of the bug on return). Only on navigation: a sort change ALWAYS refetches
    // (fresh reorder) and retry() never caches errors.
    if (!isSortChange) {
      const cached = getCachedThread(threadId);
      if (cached && cached.thread) {
        setThread(cached.thread);
        setReplies(cached.replies || []);
        setHasMore(Boolean(cached.hasMore));
        nextUrlRef.current = cached.nextUrl || null;
        if (cached.sortBy) {
          setSortBy(cached.sortBy);
          sortByRef.current = cached.sortBy;
        }
        setError(null);
        setIsLoading(false);
        setIsSwitchingThread(false);
        return undefined;
      }
    }

    // FETCH FRESH (anti-race with requestIdRef + cache busting + ordering). On a
    // sort change we use isReloadingReplies (dim, replies visible); otherwise
    // isLoading (skeletons on initial load). The sync effect persists to the cache.
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();

    if (isSortChange) {
      setIsReloadingReplies(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    // A fresh page invalidates any stale pagination failure (new thread /
    // retry / re-sorted list — the old error belongs to the previous list).
    setLoadMoreError(null);

    async function fetchThread() {
      try {
        const data = await getThreadById(threadId, {
          signal: controller.signal,
          ordering: buildReplyOrdering(sortByRef.current),
        });
        if (requestId !== requestIdRef.current) return;
        const mapped = mapBackendThreadToFrontend(data);
        setThread(mapped.thread);
        setReplies(mapped.replies);
        nextUrlRef.current = mapped.next;
        setHasMore(Boolean(mapped.next));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err && err.name === "AbortError") return;
        // On a sort change we keep the current replies (only the dim is
        // removed); the full-screen error state is only for the initial load.
        if (!isSortChange) {
          setError(err);
          setThread(null);
          setReplies([]);
          setHasMore(false);
          nextUrlRef.current = null;
        }
      } finally {
        // Only the most recent request turns off the loading flags.
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsReloadingReplies(false);
          setIsSwitchingThread(false);
        }
      }
    }

    fetchThread();
    return () => controller.abort();
  }, [threadId, refetchKey, sortKey, getCachedThread]);

  // selectSort: changes the sort and ALWAYS triggers a refetch (even when
  // re-clicking the same option), same as FeedContext's selectSort.
  const selectSort = useCallback((newSort) => {
    setSortBy(newSort);
    sortByRef.current = newSort;
    isSortChangeRef.current = true;
    setSortKey((k) => k + 1);
  }, []);

  // Cache sync: whenever the loaded thread changes (fetch, loadMore,
  // createReply, optimistic toggleReaction) we write the current snapshot to
  // the cache, indexed by threadId. This way, on return, the content —including
  // paginated replies and reactions— is available instantly. A single write
  // point avoids forgetting to sync on some specific mutation.
  // NEVER while the initial load is in flight: with a seeded thread (feed
  // navigation) that would persist {seed, replies: []} to the cache, and the
  // fetch effect's next run (StrictMode remount, refetch) would treat it as a
  // CACHE HIT and skip the fetch — replies would never load.
  useEffect(() => {
    if (!threadId || !thread || isLoading) return;
    setCachedThread(threadId, {
      thread,
      replies,
      hasMore,
      nextUrl: nextUrlRef.current,
      sortBy,
    });
  }, [threadId, thread, replies, hasMore, sortBy, isLoading, setCachedThread]);

  const loadMore = useCallback(async () => {
    // Guard: don't paginate without next, nor with a fetch (initial or
    // pagination) already in flight.
    if (!nextUrlRef.current || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const data = await getThreadReplies(nextUrlRef.current);
      const additions = mapBackendRepliesToFrontend(data.results);
      setReplies((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...additions.filter((r) => !seen.has(r.id))];
      });
      nextUrlRef.current = data.next || null;
      setHasMore(Boolean(data.next));
    } catch (err) {
      // Surfaced as a retry banner (infinite scroll): while set, the sentinel
      // is not rendered, so a persistent failure never re-fires on its own —
      // the user retries explicitly. hasMore stays true (the page is still there).
      setLoadMoreError(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoading]);

  /**
   * Creates a reply. parentId = threadId for a direct comment, or a reply's id
   * for a sub-comment. Bottom-insert on success, replicating the legacy
   * (onRefreshThread does threads.concat(new)). Preserves the text on error
   * (re-throws so PostCommentBox doesn't clear the textarea).
   */
  const createReply = useCallback(
    async ({ parentId, text }) => {
      const trimmed = (text || "").trim();
      if (!trimmed) throw new Error("Text cannot be empty");

      const targetParentId = parentId || threadId;
      setIsCreatingReply(true);
      setCreateReplyError(null);
      try {
        const created = await createReplyRequest({
          parentId: targetParentId,
          text: trimmed,
          content: buildDraftJsContent(trimmed),
        });

        // A sub-reply (parentId different from the thread) is tagged with its
        // parent so the UI indents it and shows "re: <mask>". The parent is
        // located via repliesRef (current state) so we can map outside the
        // updater and return the new reply (used by Post.js for scroll + highlight).
        const isSubReply = targetParentId !== threadId;
        const parent = isSubReply
          ? repliesRef.current.find((r) => r.id === targetParentId)
          : null;
        const mapped = mapBackendReplyToFrontend(created, {
          parentId: isSubReply ? targetParentId : null,
          parentMaskId: parent?.mask?.id || null,
        });
        // The create response carries no op_mask, so is_op would be false until
        // a reload. This reply is authored by the current user → it's OP iff
        // they authored the thread (head.is_mine). Set it locally so the "OP"
        // tag shows instantly, matching what the server returns on reload.
        mapped.isOp = Boolean(threadIsMineRef.current);
        // POSITIONAL insertion: groups the sub-reply under its parent (not at
        // the end of the thread). insertReply respects the flat list's DFS order.
        setReplies((prev) =>
          prev.some((r) => r.id === mapped.id) ? prev : insertReply(prev, mapped)
        );
        // Only on the success path: the reply (direct or sub) counts as a
        // thread reply → +1 to the total shown by the app bar. It lives in
        // thread.replyCount, so the sync effect persists it to the cache on its own.
        setThread((t) =>
          t ? { ...t, replyCount: (t.replyCount ?? 0) + 1 } : t
        );
        // Affinity (client-side, localStorage only): commenting is the
        // strongest interest signal. We record the tags of the content being
        // replied to: a reply of any level (the parent, resolved above from
        // the flat list) or the root thread for direct comments. A reply with
        // no tags → fallback to the thread's.
        addInteraction(
          parent
            ? tagsForContent(parent.text, threadTagsRef.current)
            : threadTagsRef.current,
          AFFINITY_WEIGHTS.comment
        );
        return mapped;
      } catch (err) {
        setCreateReplyError(err);
        throw err;
      } finally {
        setIsCreatingReply(false);
      }
    },
    [threadId]
  );

  // Optimistic media injection: a reply's media is uploaded+confirmed AFTER the
  // reply is created (the create response has no media), so once the composer
  // confirms it, patch the just-inserted reply with its media — it renders
  // immediately, no reload. Same media shape as a fetched reply.
  const attachMediaToReply = useCallback((uid, media) => {
    if (!uid || !media || media.length === 0) return;
    setReplies((prev) =>
      prev.map((r) => (r.id === uid || r.uid === uid ? { ...r, media } : r))
    );
  }, []);

  /**
   * Toggles the current user's reaction on a post (thread or reply).
   * Immediate optimistic update + POST /reactions/ + rollback on error.
   * postId can be thread.id or a reply's id. clicked = { id, emoji, label }.
   */
  const toggleReaction = useCallback(
    async (postId, clicked) => {
      if (!postId || !clicked) return;
      // Anti double-click guard: ignore if there's already a toggle in flight for this post.
      if (togglingRef.current.has(postId)) return;

      // Locate the post (main thread or a reply) and snapshot for rollback.
      const isThread = thread && thread.id === postId;
      const target = isThread ? thread : replies.find((r) => r.id === postId);
      if (!target) return; // not found (or thread still loading)

      const reactionId = resolveReactionId(
        clicked,
        target,
        reactionCatalogRef.current
      );
      if (reactionId == null) {
        // Without a backend id we can't persist → we don't do an optimistic
        // update that couldn't be saved.
        // eslint-disable-next-line no-console
        console.warn("No backend reaction id for emoji:", clicked.emoji);
        return;
      }

      // Snapshot of the previous state (for rollback) and computation of the new state.
      const prevReactions = target.reactions;
      const prevCUR = target.currentUserReaction ?? null;
      const nextReactions = applyToggle(prevReactions, clicked);
      const nextCUR = nextReactions.find((r) => r.userReacted)?.emoji ?? null;

      const writePost = (reactions, currentUserReaction) => {
        if (isThread) {
          setThread((t) =>
            t && t.id === postId ? { ...t, reactions, currentUserReaction } : t
          );
        } else {
          setReplies((rs) =>
            rs.map((r) =>
              r.id === postId ? { ...r, reactions, currentUserReaction } : r
            )
          );
        }
      };

      // 1. Optimistic: the UI updates instantly.
      togglingRef.current.add(postId);
      writePost(nextReactions, nextCUR);

      try {
        // 2. Persist. The backend decides add/switch/remove based on the user's state.
        await createReaction({ reactionId, postId });
        // Affinity (client-side, localStorage only): counts only when ADDING
        // a new reaction (nextCUR goes from null/another emoji to this one) — a
        // toggle-off (removing the reaction) is not an interest signal.
        // We record the tags of the REACTED content: the thread or the reply
        // of ANY level (target is already resolved above, whether it comes
        // from the flat replies list or is the root thread). A reply with no
        // tags → fallback to the thread's (signal about the topic).
        if (nextCUR && nextCUR !== prevCUR) {
          addInteraction(
            tagsForContent(target.text, threadTagsRef.current),
            AFFINITY_WEIGHTS.reaction
          );
        }
      } catch (err) {
        // 3. Silent rollback — it's a micro-interaction, no intrusive banner.
        if (isMountedRef.current) writePost(prevReactions, prevCUR);
        // eslint-disable-next-line no-console
        console.warn("Reaction failed, rolled back:", err);
      } finally {
        togglingRef.current.delete(postId);
      }
    },
    [thread, replies]
  );

  // Re-triggers the initial fetch by bumping refetchKey (same as FeedContext).
  const retry = useCallback(() => setRefetchKey((k) => k + 1), []);

  return {
    thread,
    replies,
    isLoading,
    isSwitchingThread,
    isLoadingMore,
    loadMoreError,
    isReloadingReplies,
    isCreatingReply,
    createReplyError,
    hasMore,
    error,
    sortBy,
    selectSort,
    createReply,
    attachMediaToReply,
    loadMore,
    retry,
    toggleReaction,
  };
}
