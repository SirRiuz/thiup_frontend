import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HomeCompose from "../components/home/HomeCompose";
import HomeFilterBar from "../components/home/HomeFilterBar";
import CloseYouGate from "../components/home/CloseYouGate";
import CloseYouRadiusBar from "../components/home/CloseYouRadiusBar";
import HomeFeedCard from "../components/home/HomeFeedCard";
import HomeFeedCardSkeleton from "../components/home/HomeFeedCardSkeleton";
import HomeFeedSpinner from "../components/home/HomeFeedSpinner";
import HomeFeedEmptyState from "../components/home/HomeFeedEmptyState";
import HomeFeedErrorState from "../components/home/HomeFeedErrorState";
import HomeFeedRetryBanner from "../components/home/HomeFeedRetryBanner";
import { useFeedContext } from "../contexts/FeedContext";
import { useCurrentUser } from "../contexts/CurrentUserContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import usePageTitle from "../hooks/usePageTitle";
import useMobileSurfacePage from "../hooks/useMobileSurfacePage";
import styles from "../styles/screens/HomeNew.module.css";
import cx from "../utils/cx";

function HomeNew() {
  const composeRef = useRef(null);
  const pageRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Home = solo la marca ("Thiup"), sin sufijo de página.
  usePageTitle();
  // Mobile: full-bleed #fdfcf8 sheet — paint html/body/AppShell to match so the
  // iOS elastic overscroll never shows a mismatched warm strip (same treatment
  // as the thread view; restores on unmount / desktop).
  useMobileSurfacePage(pageRef);
  // REAL current user (from /me/): a single global request, cached in the
  // context — here it is only consumed.
  const { currentUserMask } = useCurrentUser();

  const {
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
  } = useFeedContext();

  // Home tabs: For You (default) and Close You. HomeFilterBar is reused
  // as-is (same pattern as search) — stable internal IDENTITY ("for
  // you"/"close you") ↔ tab keys; the VISIBLE text is translated via
  // getOptionLabel (the identity never changes language).
  const TAB_LABELS = { foryou: "for you", closeyou: "close you" };
  const LABEL_TO_TAB = { "for you": "foryou", "close you": "closeyou" };
  const TAB_I18N = { "for you": "home.tabForYou", "close you": "home.tabCloseYou" };

  // ── The ?tab= query param is the SOURCE OF TRUTH for the active tab ──
  // /home?tab=fy | /home?tab=cy — on reload, the tab is rebuilt
  // from the URL. ALL tab changes write the URL (clicks and the gate's
  // "not now"); the context's feedTab is a mirror that is
  // synced URL → context in the effect below (a single direction,
  // no dual truths and no loops).
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTabParam = searchParams.get("tab");
  const urlTab = rawTabParam === "cy" ? "closeyou" : "foryou";

  // Smooth-transition pattern from /search: the flag is set ONLY on the
  // user's action (tab click / radius change) — never by
  // observing the state, so a POP that restores ?tab= doesn't trigger the
  // scroll and the position restoration stays intact.
  const justSwitchedRef = useRef(false);

  const setTabParam = (tab) => {
    setSearchParams(
      (prev) => {
        // Preserve the other query params: only `tab` is touched.
        const next = new URLSearchParams(prev);
        next.set("tab", tab === "closeyou" ? "cy" : "fy");
        return next;
      },
      { replace: true } // switching tab doesn't fill the history
    );
  };

  // Invalid param (?tab=zzz) → clear it: /home without the param (the
  // For You default needs no query). The other params are preserved.
  useEffect(() => {
    if (rawTabParam && rawTabParam !== "fy" && rawTabParam !== "cy") {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("tab");
          return next;
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTabParam]);

  // URL → context: on reload with ?tab=close (or when the param changes),
  // selectFeedTab runs just like a click — including the Close You
  // permission flow (granted→feed, prompt→opt-in, denied→blocked).
  useEffect(() => {
    if (urlTab !== feedTab) {
      selectFeedTab(urlTab);
    }
  }, [urlTab, feedTab, selectFeedTab]);

  // ── Anti "flash of wrong state" ──────────────────────────────────────
  // Between the URL changing to ?tab=cy and the effect syncing the context
  // there is ONE render where closeYouStatus is still the OLD value (e.g.
  // "denied" from a previous visit, even though the permission is already
  // granted). That frame used to paint the blocked message — the flash.
  // While the context is not synced, the gate ALWAYS shows
  // the neutral "checking" state (the subtle "finding your area…", with its
  // icon pulsing) — never a message that the async check might
  // contradict an instant later.
  const closeYouSyncing = urlTab === "closeyou" && feedTab !== "closeyou";
  const gateStatus = closeYouSyncing ? "locating" : closeYouStatus;

  // The Close You gate replaces the feed area while there are no
  // cells (checking / prompt / denied...) — the feed never mounts without
  // the reader's opt-in.
  const showCloseYouGate =
    urlTab === "closeyou" &&
    (closeYouSyncing ||
      ["prompt", "locating", "denied", "error", "unavailable", "unsupported"].includes(
        closeYouStatus
      ));

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  // Entrance of the NEW content after a switch (tab/radius): a FIXED-
  // duration animation (~240ms, CSS) tied to the CONTENT CHANGE — not to
  // the loading state. The dim tied to isLoading is invisible on localhost
  // (fetch ~30ms = 1-2 frames); this animation plays in FULL
  // even if the data arrives instantly, without slowing down any fetch.
  const [isEntering, setIsEntering] = useState(false);
  const enterTimerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, []);

  // Switch settle (smooth scroll + enter fade) — useLayoutEffect: the
  // entrance class is applied BEFORE the paint of the new content (no
  // intermediate frame at full opacity = no flash).
  useLayoutEffect(() => {
    if (!justSwitchedRef.current) return;
    if (!isLoading && posts.length > 0) {
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
      if (!reduceMotion) {
        // Re-applicable on each switch: removing the class when the
        // animation ends lets the next switch restart it.
        setIsEntering(true);
        if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
        enterTimerRef.current = setTimeout(() => {
          setIsEntering(false);
          enterTimerRef.current = null;
        }, 300);
      }
      justSwitchedRef.current = false;
    }
  }, [isLoading, posts]);

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore || !!loadMoreError,
  });

  // Seed the thread view with the card's already-loaded post (router state):
  // the OP paints instantly there — only the replies show a loading state.
  const handlePostClick = (post) => {
    navigate(`/p/${post.uid}`, { state: { seedThread: post } });
  };

  // Conversation preview click → the REPLY's own permalink (it opens with
  // its ancestor chain — the root renders above it). Seeded like any card.
  const handleReplyPreviewClick = (reply) => {
    navigate(`/p/${reply.uid}`, { state: { seedThread: reply } });
  };

  // A hashtag click is a normal search for that hashtag (q=#tag) — lands on
  // /search with the standard tabs, no special tag mode.
  const handleHashtagClick = (tag) => {
    const clean = String(tag).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(`#${clean}`)}`);
  };

  const handleComposeFocus = () => {
    if (composeRef.current) {
      composeRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const isInitialLoad = isLoading && posts.length === 0;
  const isReloading = isLoading && posts.length > 0;

  const showEmpty = !isLoading && !error && posts.length === 0;
  const showError = !isLoading && error;
  const showSpinner = isLoadingMore;

  return (
    <div className={styles.page} ref={pageRef}>
      <main className={styles.main}>
        {/* Desktop masthead (Threads' 60px column header): sticky, opaque
            page-bg bar with the centered feed title; the card's rounded top
            (corner mask below) pins flush under it, exactly like Threads.
            CSS-hidden on mobile (the NavRail app bar owns that breakpoint). */}
        <header className={styles.desktopHeader}>
          <span className={styles.desktopHeaderTitle}>{t("nav.home")}</span>
        </header>
        {/* Threads-style sticky corner mask (desktop only, CSS-hidden on
            mobile): keeps the surface card's rounded top pinned while the feed
            scrolls underneath. Same anatomy as the thread view's mask (see
            Post.js) — here it pins flush under the 60px masthead. */}
        <div className={styles.cornerMask} aria-hidden="true">
          <div className={styles.cornerMaskWindow}>
            <div className={styles.cornerMaskShape} />
          </div>
        </div>
        {/* Elevated surface (thread-view style guide): one card holds compose +
            tabs + feed on desktop; full-bleed sheet on mobile. */}
        <div className={styles.surface}>
        <div ref={composeRef}>
          {/* The row only OPENS the global ComposeModal now (posting happens
              there), so it no longer needs the composeBusy gating. */}
          <HomeCompose currentUserMask={currentUserMask} />
        </div>
        <HomeFilterBar
          value={TAB_LABELS[urlTab]}
          onChange={(label) => {
            justSwitchedRef.current = true;
            setTabParam(LABEL_TO_TAB[label]);
          }}
          isLoading={isLoading}
          options={["for you", "close you"]}
          label={t("home.filterLabel")}
          getOptionLabel={(option) => t(TAB_I18N[option])}
        />
        {urlTab === "closeyou" && !showCloseYouGate && (
          <CloseYouRadiusBar
            radius={closeYouRadius}
            onChange={(km) => {
              justSwitchedRef.current = true;
              setCloseYouRadius(km);
            }}
            isLoading={isLoading}
          />
        )}
        <section className={styles.feed}>
          {showCloseYouGate && (
            <CloseYouGate
              status={gateStatus}
              onEnable={enableCloseYou}
              onRetry={retryCloseYou}
              onBack={() => setTabParam("foryou")}
            />
          )}

          {!showCloseYouGate && isInitialLoad && (
            <>
              <HomeFeedCardSkeleton variant="medium" />
              <HomeFeedCardSkeleton variant="short" />
              <HomeFeedCardSkeleton variant="long" />
            </>
          )}

          {!showCloseYouGate && showError && (
            <HomeFeedErrorState error={error} onRetry={refetch} />
          )}

          {!showCloseYouGate && showEmpty && (
            <HomeFeedEmptyState onComposeClick={handleComposeFocus} />
          )}

          {!showCloseYouGate && !isInitialLoad && !error && posts.length > 0 && (
            <div
              className={cx(styles.feedItems, isReloading ? styles.feedItemsReloading : "", isEntering ? styles.feedItemsEntering : "")}
            >
              {posts.map((post, idx) => (
                <HomeFeedCard
                  key={post.uid}
                  post={post}
                  isNew={post.uid === newPostId}
                  isLast={idx === posts.length - 1 && !hasMore}
                  onClick={() => handlePostClick(post)}
                  onReplyClick={handleReplyPreviewClick}
                  onHashtagClick={handleHashtagClick}
                />
              ))}
            </div>
          )}

          {!showCloseYouGate && hasMore && !isLoading && !error && !loadMoreError && (
            <div
              ref={sentinelRef}
              className={styles.sentinel}
              aria-hidden="true"
            />
          )}

          {!showCloseYouGate && showSpinner && !loadMoreError && <HomeFeedSpinner />}
          {loadMoreError && (
            <HomeFeedRetryBanner
              error={loadMoreError}
              onRetry={loadMore}
              isRetrying={isLoadingMore}
            />
          )}
        </section>
        </div>
      </main>
    </div>
  );
}

export default HomeNew;
