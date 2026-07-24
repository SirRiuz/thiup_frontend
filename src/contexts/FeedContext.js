import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { apiFetch } from "../api/client";
import { mapBackendPostToFrontend } from "../api/mappers/postMapper";
import { buildDraftJsContent } from "../utils/draftjs";
import { getTopTags, TOP_TAGS_COUNT } from "../utils/affinity";
import { getLanguage, getCountryCode } from "../utils/locale";
import { geohashForPosition } from "../utils/geohash";
import {
  queryGeolocationPermission,
  subscribeGeolocationPermission,
} from "../utils/geoPermission";
import { getCoarsePosition } from "../utils/robustGeolocation";
import {
  prependToMyThreadsCache,
  patchMyThreadsCacheMedia,
} from "../hooks/useMyThreads";

const FeedContext = createContext(null);

const POSTS_ENDPOINT = "/threads/";
// The home's two feeds — SAME engine in the backend (threshold + momentum +
// grace + POST pagination); the filter and boost change:
//   For You  → affinity tags + region (personal)
//   Close You → ~10km geohash cells + proximity (geographic)
const FORYOU_ENDPOINT = "/threads/foryou/";
const CLOSEYOU_ENDPOINT = "/threads/closeyou/";

// How long the just-created thread stays marked as "new" (drives the temporary
// highlight on its feed card). Slightly longer than the card's fade animation
// (~3.6s) so the class is removed only AFTER it has visually settled to normal
// — which also restores the card's hover background.
const NEW_POST_HIGHLIGHT_MS = 3800;

export function FeedProvider({ children }) {
  const [posts, setPosts] = useState([]);
  // uid of the thread the user just created — its feed card is briefly
  // highlighted so they can spot it at the top. Auto-cleared (below); applies
  // to that one thread, once.
  const [newPostId, setNewPostId] = useState(null);
  const newPostTimerRef = useRef(null);
  // Active home tab: For You (default) | Close You.
  const [feedTab, setFeedTab] = useState("foryou");
  // State of the Close You location opt-in:
  // idle | prompt (ask permission) | locating | ready | denied | unsupported
  const [closeYouStatus, setCloseYouStatus] = useState("idle");
  // Reader's geohash cell (precision 5, fuzzed) — EPHEMERAL: it lives
  // ONLY in memory (ref), never in localStorage nor persisted: no map of
  // people's locations is built. The backend generates the radius grid
  // from it.
  const closeYouCellRef = useRef(null);
  // Counter of Close You geolocation attempts: only the most recent attempt
  // writes state (the robust strategy can take a while).
  const closeYouGeoAttemptRef = useRef(0);
  // Close You radius (km). ONLY the number is persisted (it's not sensitive
  // data) to remember the preference between sessions.
  const [closeYouRadius, setCloseYouRadiusState] = useState(() => {
    try {
      const saved = parseFloat(
        window.localStorage.getItem("thiup:closeyou-radius")
      );
      if (Number.isFinite(saved)) {
        return Math.min(100, Math.max(15, saved));
      }
    } catch (err) {
      /* no storage */
    }
    return 15;
  });
  const closeYouRadiusRef = useRef(closeYouRadius);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);
  // POST pagination: the feed body (lang/region/tags) is fixed on the
  // initial fetch and loadMore re-POSTs the SAME body to ?page=N+1 (the
  // ?page= is short and not sensitive; the tags always go in the body).
  const feedBodyRef = useRef({});
  const feedEndpointRef = useRef(FORYOU_ENDPOINT);
  const pageRef = useRef(1);
  const hasNextPageRef = useRef(false);
  // Incremental counter: each initial-fetch request gets a unique ID.
  // Only the request with the highest ID (the most recent) updates state and
  // turns off isLoading. Replaces the `let cancelled = false` pattern, which
  // could leave isLoading stuck on true if the last fetch was also cancelled.
  const requestIdRef = useRef(0);
  // Signature of the top tags used in the LAST fetch. If the affinity profile
  // changed while the user was navigating (they interacted in a thread),
  // ensureLoaded triggers a dim reload on returning to the home — so the
  // personalization shows in the same session, without waiting for a reload.
  const lastTagsSignatureRef = useRef(null);

  // Initial fetch — only runs when hasInitialized becomes true.
  // Avoids a fetch on app load if the user never visits /home-new.
  useEffect(() => {
    if (!hasInitialized) return undefined;
    // Close You with no cells → there's nothing to request yet (the feed
    // area shows the opt-in / denied gate in HomeNew). KEY: turn off
    // isLoading here — on a COLD entry via URL (?tab=cy), ensureLoaded had
    // just turned it on (For You anti-flash) and this early return left it
    // stuck on true forever, freezing the tabs (HomeFilterBar ignores
    // clicks while isLoading) and the spinner.
    if (feedTab === "closeyou" && !closeYouCellRef.current) {
      setIsLoading(false);
      return undefined;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();

    async function fetchInitial() {
      setIsLoading(true);
      setError(null);
      setLoadMoreError(null);
      try {
        // POST with the feed params in the BODY — PRIVACY: the tags
        // reveal interests and in a GET they ended up in nginx/proxies'
        // access logs (the URL is logged; the body isn't). ONLY the names
        // of the affinity profile's top tags are sent — ephemeral; the
        // full map and its weights NEVER leave the device (see
        // src/utils/affinity.js). No tags (new user) → body with no
        // tags → global top (cold start). lang/region come from
        // navigator.language, no GeoIP. No `_t`: POST is not cached.
        let endpoint;
        let body;
        if (feedTab === "closeyou") {
          // Close You: ONLY the reader's cell (ephemeral, in memory) +
          // the chosen radius — no tags or region: it's geographic, not
          // personal. The backend expands the adaptive grid.
          endpoint = CLOSEYOU_ENDPOINT;
          body = {
            geohash: closeYouCellRef.current,
            radius_km: closeYouRadiusRef.current,
          };
        } else {
          endpoint = FORYOU_ENDPOINT;
          const topTags = getTopTags(TOP_TAGS_COUNT);
          lastTagsSignatureRef.current = topTags.join(",");
          body = { lang: getLanguage() };
          if (topTags.length) body.tags = topTags;
          const country = getCountryCode();
          if (country) body.region = country;
        }
        feedEndpointRef.current = endpoint;
        feedBodyRef.current = body;
        pageRef.current = 1;

        const data = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        setPosts((data.results || []).map(mapBackendPostToFrontend));
        hasNextPageRef.current = Boolean(data.next);
        setHasMore(Boolean(data.next));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err && err.name === "AbortError") return;
        setError(err);
        setPosts([]);
        setHasMore(false);
        hasNextPageRef.current = false;
      } finally {
        // Only the most recent request turns off isLoading.
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }

    fetchInitial();
    return () => {
      controller.abort();
    };
  }, [hasInitialized, refetchKey, feedTab]);

  // Lazy init trigger — HomeNew calls it on mount.
  // Idempotent: on later mounts hasInitialized is already true → no
  // refetch... UNLESS the affinity profile changed since the last fetch
  // (the user reacted/commented/read in a thread): in that case it reloads
  // with the fresh tags. It's a DIM reload (there are visible posts →
  // feedItemsReloading), not skeletons, and only if the signature really
  // changed — returning to the home with no new interactions doesn't refetch
  // (the back-nav scroll restoration stays intact).
  // The synchronous setIsLoading(true) avoids the empty-state flash between
  // setHasInitialized and the commit of the fetch effect.
  const ensureLoaded = useCallback(() => {
    if (hasInitialized) {
      // The affinity signature only applies to For You (Close You doesn't use tags).
      if (feedTab === "foryou") {
        const signature = getTopTags(TOP_TAGS_COUNT).join(",");
        if (signature !== lastTagsSignatureRef.current) {
          setRefetchKey((k) => k + 1);
        }
      }
      return;
    }
    setHasInitialized(true);
    setIsLoading(true);
  }, [hasInitialized, feedTab]);

  // Reader opt-in: ask for location, fuzz + encode to COARSE geohash cells
  // (precision 5) and query. The coords are discarded instantly; the cells
  // live only in memory (ephemeral). The ONLY persistent memory is the
  // boolean that the user opted in (fallback for browsers without the
  // Permissions API) — never the area.
  //
  // The acquisition is ROBUST (getCoarsePosition): low accuracy + cache +
  // backoff retries on POSITION_UNAVAILABLE/TIMEOUT (WebKit's transient
  // kCLErrorLocationUnknown) + a watchPosition fallback. The error state is
  // only shown after EXHAUSTING the whole strategy; with this, a
  // CoreLocation hiccup no longer breaks Close You with the permission
  // granted.
  //
  // Anti-stale guard: the strategy can take several seconds — if the user
  // re-triggers (Try again / re-enter), only the most recent attempt writes
  // state.
  const enableCloseYou = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCloseYouStatus("unsupported");
      return;
    }
    setCloseYouStatus("locating");
    closeYouGeoAttemptRef.current += 1;
    const attemptId = closeYouGeoAttemptRef.current;

    getCoarsePosition().then(
      (position) => {
        if (attemptId !== closeYouGeoAttemptRef.current) return;
        closeYouCellRef.current = geohashForPosition(
          position.coords.latitude,
          position.coords.longitude
        );
        try {
          window.localStorage.setItem("thiup:closeyou-optin", "true");
        } catch (err) {
          /* no storage: the opt-in isn't remembered, nothing breaks */
        }
        setCloseYouStatus("ready");
        setRefetchKey((k) => k + 1);
      },
      (geoError) => {
        if (attemptId !== closeYouGeoAttemptRef.current) return;
        // code 1 = PERMISSION_DENIED (blocked at the browser level →
        // settings instructions; NEVER retried). Any other error reaches
        // here only after exhausting retries + fallback → "error" state
        // with retry.
        // Distinguish the DEVICE's location service being down
        // (POSITION_UNAVAILABLE, e.g. CoreLocation's kCLErrorLocationUnknown)
        // from our generic failure — the gate tells the user it's not Thiup.
        setCloseYouStatus(
          geoError && geoError.code === 1
            ? "denied"
            : geoError && geoError.code === 2
            ? "unavailable"
            : "error"
        );
      }
    );
  }, []);

  // "Try again" from the error/blocked state: re-checks the REAL state of
  // the permission and acts accordingly:
  //   prompt  → getCurrentPosition REOPENS the browser's native dialog
  //   granted → direct retry (recovers from timeouts / lack of signal)
  //   denied  → the browser does NOT allow reopening the dialog: it stays
  //             in the state with the settings instructions
  //   no Permissions API → direct attempt (opens the dialog if it's
  //             undecided; if it's blocked, the error captures it)
  const retryCloseYou = useCallback(async () => {
    setCloseYouStatus("locating");
    const state = await queryGeolocationPermission();
    if (state === "denied") {
      setCloseYouStatus("denied");
      return;
    }
    enableCloseYou();
  }, [enableCloseYou]);

  // Changes the Close You radius: clamp 15-100, persists the number and
  // reloads the feed (dim, no flicker) if the tab is active.
  const setCloseYouRadius = useCallback((km) => {
    const clamped = Math.min(100, Math.max(15, Number(km) || 15));
    closeYouRadiusRef.current = clamped;
    setCloseYouRadiusState(clamped);
    try {
      window.localStorage.setItem("thiup:closeyou-radius", String(clamped));
    } catch (err) {
      /* no storage: doesn't persist, doesn't break */
    }
    // Synchronous loading on radius change too: no false-isLoading window
    // during the Close You reload (keeps the compose Post button disabled).
    setIsLoading(true);
    setRefetchKey((k) => k + 1);
  }, []);

  // Decides what to show on entering Close You WITHOUT cells, by querying
  // the REAL state of the permission (Permissions API — it's browser state,
  // not location: it doesn't touch privacy):
  //   granted → direct location, WITHOUT re-showing the prompt (the bug)
  //   prompt  → explanatory opt-in (the browser will ask on activation)
  //   denied  → "blocked, enable it in settings" state (re-asking is
  //             impossible at the browser level)
  // Without the Permissions API (old Safari) → if the user already opted in
  // before (flag), try directly (if the permission is still granted it
  // doesn't re-ask); otherwise, prompt.
  const resolveCloseYouEntry = useCallback(async () => {
    const state = await queryGeolocationPermission();

    if (state === "granted") {
      enableCloseYou();
      return;
    }
    if (state === "denied") {
      setCloseYouStatus("denied");
      return;
    }
    if (state === "prompt") {
      setCloseYouStatus("prompt");
      return;
    }

    // Fallback without the Permissions API.
    let optedBefore = false;
    try {
      optedBefore =
        window.localStorage.getItem("thiup:closeyou-optin") === "true";
    } catch (err) {
      optedBefore = false;
    }
    if (optedBefore) {
      enableCloseYou();
    } else {
      setCloseYouStatus("prompt");
    }
  }, [enableCloseYou]);

  // LIVE permission: if the user changes it in the browser's settings,
  // the Close You state doesn't go stale — granting while on the blocked
  // gate loads the feed; blocking invalidates the cells and shows the
  // correct gate on the next entry.
  const feedTabRef = useRef(feedTab);
  useEffect(() => {
    feedTabRef.current = feedTab;
  }, [feedTab]);
  const closeYouStatusRef = useRef(closeYouStatus);
  useEffect(() => {
    closeYouStatusRef.current = closeYouStatus;
  }, [closeYouStatus]);

  useEffect(() => {
    const unsubscribe = subscribeGeolocationPermission((state) => {
      const status = closeYouStatusRef.current;
      if (state === "granted") {
        if (status === "denied" || status === "unsupported") {
          if (feedTabRef.current === "closeyou") {
            // Was looking at the blocked gate: load directly.
            enableCloseYou();
          } else {
            setCloseYouStatus("idle");
          }
        }
      } else if (state === "denied") {
        closeYouCellRef.current = null;
        if (feedTabRef.current === "closeyou" && status !== "idle") {
          setCloseYouStatus("denied");
        }
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Home tab change. Close You with no cells → first resolve the real
  // state of the permission (without re-showing unnecessary prompts). The
  // reload between tabs is DIM (posts visible), same pattern as the rest.
  const selectFeedTab = useCallback((tab) => {
    if (tab === feedTab) return;
    if (tab === "closeyou" && !closeYouCellRef.current) {
      setFeedTab("closeyou");
      setCloseYouStatus("locating");
      resolveCloseYouEntry();
      return;
    }
    setFeedTab(tab);
    // Enter the loading state SYNCHRONOUSLY (same batched render as the tab
    // change), so there is no intermediate render where isLoading is still
    // false during the transition — that window let controls bound to
    // isLoading (e.g. the compose Post button) flash enabled with the previous
    // tab's data before the fetch effect set isLoading=true.
    setIsLoading(true);
    setRefetchKey((k) => k + 1);
  }, [feedTab, resolveCloseYouEntry]);

  const loadMore = useCallback(async () => {
    if (!hasNextPageRef.current || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      // Next page: re-POST of the SAME feed body (lang/region/tags
      // frozen on the initial fetch — page N must be consistent with
      // page 1) to ?page=N+1.
      const nextPage = pageRef.current + 1;
      const data = await apiFetch(
        `${feedEndpointRef.current}?page=${nextPage}`,
        {
          method: "POST",
          body: JSON.stringify(feedBodyRef.current),
        }
      );
      pageRef.current = nextPage;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const additions = (data.results || [])
          .map(mapBackendPostToFrontend)
          .filter((p) => !seen.has(p.id));
        return [...prev, ...additions];
      });
      hasNextPageRef.current = Boolean(data.next);
      setHasMore(!!data.next);
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

  const createPost = useCallback(async (text, { geohash } = {}) => {
    const trimmed = (text || "").trim();
    if (!trimmed) {
      throw new Error("Text cannot be empty");
    }

    const payload = {
      text: trimmed,
      content: buildDraftJsContent(trimmed),
      // The thread is tagged with the language/region of whoever creates it
      // (navigator.language): language feeds For You's language filter;
      // region the regional boost. No GeoIP.
      language: getLanguage(),
      region: getCountryCode(),
    };
    // geohash: ONLY if the author enabled location sharing (opt-in).
    // It arrives already coarse (precision 5) and fuzzed from HomeCompose.
    if (geohash) payload.geohash = geohash;

    const created = await apiFetch(POSTS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const mapped = mapBackendPostToFrontend(created);
    setPosts((prev) =>
      prev.some((p) => p.id === mapped.id) ? prev : [mapped, ...prev]
    );
    // Mark it as the just-created thread → its feed card highlights briefly.
    // The auto-clear effect below removes the mark after the fade settles.
    setNewPostId(mapped.uid);
    // Same prepend to the My threads cache: the new thread shows up in the
    // user's list when they visit it — freshness without extra requests.
    prependToMyThreadsCache(mapped);
    return mapped;
  }, []);

  // Optimistic media injection: media is uploaded+confirmed AFTER the thread is
  // created (the create response has no media yet), so once the composer
  // confirms it, patch the just-created post with its media — it renders
  // immediately, no reload. Same media shape as a fetched thread, so
  // ThreadMedia needs no special case.
  const attachMediaToPost = useCallback((uid, media) => {
    if (!uid || !media || media.length === 0) return;
    setPosts((prev) =>
      prev.map((p) => (p.uid === uid || p.id === uid ? { ...p, media } : p))
    );
    patchMyThreadsCacheMedia(uid, media);
  }, []);

  // Auto-clear the "new" mark once the highlight has faded, so it never
  // re-triggers on re-render/scroll and the card returns to a plain cell. The
  // cleanup clears the timer on unmount or when a newer thread takes over (no
  // setState on an unmounted provider).
  useEffect(() => {
    if (!newPostId) return undefined;
    newPostTimerRef.current = window.setTimeout(
      () => setNewPostId(null),
      NEW_POST_HIGHLIGHT_MS
    );
    return () => window.clearTimeout(newPostTimerRef.current);
  }, [newPostId]);

  const value = {
    posts,
    newPostId,
    feedTab,
    selectFeedTab,
    closeYouStatus,
    enableCloseYou,
    retryCloseYou,
    closeYouRadius,
    setCloseYouRadius,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    ensureLoaded,
    loadMore,
    refetch,
    createPost,
    attachMediaToPost,
  };

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeedContext() {
  const ctx = useContext(FeedContext);
  if (!ctx) {
    throw new Error("useFeedContext must be used within a FeedProvider");
  }
  return ctx;
}
