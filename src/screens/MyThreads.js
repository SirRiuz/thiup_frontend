import { useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HomeFeedCard from "../components/home/HomeFeedCard";
import HomeFilterBar from "../components/home/HomeFilterBar";
import HomeFeedCardSkeleton from "../components/home/HomeFeedCardSkeleton";
import HomeFeedSpinner from "../components/home/HomeFeedSpinner";
import HomeFeedErrorState from "../components/home/HomeFeedErrorState";
import HomeFeedRetryBanner from "../components/home/HomeFeedRetryBanner";
import MeProfileHeader from "../components/me/MeProfileHeader";
import { useMyThreads } from "../hooks/useMyThreads";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import usePageTitle from "../hooks/usePageTitle";
import useMobileSurfacePage from "../hooks/useMobileSurfacePage";
import useFlushBottom from "../hooks/useFlushBottom";
import cx from "../utils/cx";
import {
  playTileVideoOnHover,
  stopTileVideoOnLeave,
} from "../components/media/mediaTileHoverPlay";
import {
  isTileMediaLoaded,
  markTileMediaLoaded,
} from "../services/media/tileMediaMemory";
import styles from "../styles/screens/MyThreads.module.css";

/**
 * /me — the threads created by the AUTHENTICATED user ("My threads").
 *
 * The scope is 100% server-side (GET /threads/mine/ filters by request.mask):
 * this screen can never list other users' threads. It reuses the SAME feed
 * cells (HomeFeedCard) and the same smooth loading pattern as home:
 * skeletons on the initial load, infinite scroll with a sentinel, error/retry.
 */
function MyThreads() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pageRef = useRef(null);
  usePageTitle("pageTitle.myThreads", { noindex: true });
  // Mobile: the canonical full-bleed #fdfcf8 sheet (same as /home, /search
  // and /p/:id) — html/body/AppShell painted to match, no warm overscroll strip.
  useMobileSurfacePage(pageRef);

  const {
    posts,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    refetch,
  } = useMyThreads();

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

  const handleHashtagClick = (tag) => {
    const clean = String(tag).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(`#${clean}`)}`);
  };

  const isInitialLoad = isLoading && posts.length === 0;
  const isReloading = isLoading && posts.length > 0;
  const showEmpty = !isLoading && !error && posts.length === 0;
  const showError = !isLoading && error;

  // Profile tabs (Threads' profile strip): Threads · Media. The media grid is
  // derived CLIENT-SIDE from the already-loaded threads — one tile per thread
  // (its first file, same one-per-thread rule as the search gallery), with
  // the carousel/Reel marks; tapping a tile opens that thread (seeded).
  // The active tab lives in the URL (?tab=media) — the app's single source
  // of truth: opening a thread and coming BACK restores the tab (and with
  // it, the saved scroll lands on the right layout). Local state reset on
  // remount and lost it.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "media" ? "media" : "mine";
  const setActiveTab = (tab) => {
    if (tab === activeTab) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        // 'mine' is the default — keep the URL clean.
        if (tab === "media") next.set("tab", "media");
        else next.delete("tab");
        return next;
      },
      { replace: true } // switching tab doesn't fill the history
    );
  };
  const mediaTiles = posts.flatMap((post) =>
    post.media && post.media.length > 0
      ? [{ post, file: post.media[0], count: post.media.length }]
      : []
  );

  // Flush-into-the-corners only when the mosaic REALLY reaches the card's
  // bottom (the surface is min-height stretched — a short grid floats
  // mid-card and must keep square tiles).
  const surfaceRef = useRef(null);
  const mediaSectionRef = useRef(null);
  const mediaFlush = useFlushBottom(
    mediaSectionRef,
    surfaceRef,
    // Mirrors the section's own render condition — the effect must re-run
    // when the section appears (post-load), or it observes nothing.
    activeTab === "media" && !isInitialLoad && !error,
    mediaTiles.length
  );

  return (
    <div className={styles.page} ref={pageRef}>
      <main className={styles.main}>
        {/* Desktop masthead — the canonical 60px column header (home/search
            language); mobile keeps the fixed NavRail app bar. */}
        <header className={styles.desktopHeader}>
          <span className={styles.desktopHeaderTitle}>
            {t("pageTitle.myThreads")}
          </span>
        </header>
        {/* Sticky corner mask (desktop): pins the surface card's rounded top
            under the masthead — same anatomy as home/search/thread. */}
        <div className={styles.cornerMask} aria-hidden="true">
          <div className={styles.cornerMaskEdge} />
          <div className={cx(styles.cornerCap, styles.cornerCapLeft)}>
            <div className={styles.cornerCapBox} />
          </div>
          <div className={cx(styles.cornerCap, styles.cornerCapRight)}>
            <div className={styles.cornerCapBox} />
          </div>
        </div>

        {/* The canonical elevated surface (fourth member after /home, /search
            and /p/:id): profile header + tab + the thread list, one card. */}
        <div className={styles.surface} ref={surfaceRef}>
          {/* Anonymous identity + private stats — Threads' profile header
              anatomy (name block left, avatar right), flat on the column. */}
          <MeProfileHeader />

          {/* Threads' profile tab row (their Threads/Replies/Media strip):
              the thread list + the media gallery. */}
          <HomeFilterBar
            label={null}
            options={["mine", "media"]}
            value={activeTab}
            onChange={setActiveTab}
            getOptionLabel={(option) =>
              option === "media"
                ? t("myThreads.tabMedia")
                : t("myThreads.tabThreads")
            }
          />

          {/* === Media tab: the profile gallery (search-grid language) === */}
          {activeTab === "media" && !isInitialLoad && !error && (
            <section
              ref={mediaSectionRef}
              className={cx(styles.mediaSection, mediaFlush ? styles.mediaSectionFlush : "")}
            >
              {mediaTiles.length > 0 ? (
                <div className={styles.mediaGrid}>
                  {mediaTiles.map(({ post, file, count }) => (
                    <button
                      key={file.id}
                      type="button"
                      className={cx(styles.mediaTile, file.isNsfw ? styles.mediaTileNsfw : "")}
                      style={
                        file.dominantColor
                          ? {
                              background: file.dominantColor.startsWith("#")
                                ? file.dominantColor
                                : `#${file.dominantColor}`,
                            }
                          : undefined
                      }
                      onClick={() => handlePostClick(post)}
                      onMouseEnter={playTileVideoOnHover}
                      onMouseLeave={stopTileVideoOnLeave}
                      aria-label={t("myThreads.mediaTileLabel")}
                    >
                      {file.type === "video" ? (
                        <video
                          className={styles.mediaTileMedia}
                          src={file.url}
                          preload="metadata"
                          muted
                          playsInline
                          loop
                        />
                      ) : (
                        <img
                          className={styles.mediaTileMedia}
                          src={file.url}
                          alt=""
                          /* No-blink restore (X/Threads): URLs that already
                             loaded this session mount EAGER (straight from
                             the HTTP cache) + SYNC decode → painted in the
                             first frame, no placeholder flash. First-time
                             tiles keep the lazy + dominant-color path. */
                          loading={isTileMediaLoaded(file.url) ? "eager" : "lazy"}
                          decoding="sync"
                          onLoad={() => markTileMediaLoaded(file.url)}
                        />
                      )}
                      {/* ONE type mark per tile (IG's grid rule): carousel
                          wins; a lone video shows IG's Reel glyph. */}
                      {count > 1 ? (
                        <span
                          className={styles.mediaTileMark}
                          role="img"
                          aria-label={t("media.multipleIndicator")}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 48 48"
                            fill="currentColor"
                          >
                            <path d="M34.8 29.7V11c0-2.9-2.3-5.2-5.2-5.2H11c-2.9 0-5.2 2.3-5.2 5.2v18.7c0 2.9 2.3 5.2 5.2 5.2h18.7c2.8-.1 5.1-2.4 5.1-5.2zM39.2 15v16.1c0 4.5-3.7 8.2-8.2 8.2H14.9c-.6 0-.9.7-.5 1.1 1 1.1 2.4 1.8 4.1 1.8h13.4c5.7 0 10.3-4.6 10.3-10.3V18.5c0-1.6-.7-3.1-1.8-4.1-.5-.4-1.2 0-1.2.6z" />
                          </svg>
                        </span>
                      ) : file.type === "video" ? (
                        <span
                          className={styles.mediaTileMark}
                          role="img"
                          aria-label={t("media.video")}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M22.942 7.464c-.062-1.36-.306-2.143-.511-2.671a5.366 5.366 0 0 0-1.272-1.952 5.364 5.364 0 0 0-1.951-1.27c-.53-.207-1.312-.45-2.673-.513-1.2-.054-1.557-.066-4.535-.066s-3.336.012-4.536.066c-1.36.062-2.143.306-2.672.511-.769.3-1.371.692-1.951 1.272s-.973 1.182-1.27 1.951c-.207.53-.45 1.312-.513 2.673C1.004 8.665.992 9.022.992 12s.012 3.336.066 4.536c.062 1.36.306 2.143.511 2.671.298.77.69 1.373 1.272 1.952.58.581 1.182.974 1.951 1.27.53.207 1.311.45 2.673.513 1.199.054 1.557.066 4.535.066s3.336-.012 4.536-.066c1.36-.062 2.143-.306 2.671-.511a5.368 5.368 0 0 0 1.953-1.273c.58-.58.972-1.181 1.27-1.95.206-.53.45-1.312.512-2.673.054-1.2.066-1.557.066-4.535s-.012-3.336-.066-4.536Zm-7.085 6.055-5.25 3c-1.167.667-2.619-.175-2.619-1.519V9c0-1.344 1.452-2.186 2.619-1.52l5.25 3c1.175.672 1.175 2.368 0 3.04Z" />
                          </svg>
                        </span>
                      ) : null}
                      {file.isNsfw && (
                        <span
                          className={styles.mediaTileNsfwGlyph}
                          aria-hidden="true"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                !isLoading && (
                  /* Same warm empty-state anatomy as the threads tab: tile
                     glyph + title + whisper body. */
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon} aria-hidden="true">
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                    <p className={styles.emptyTitle}>
                      {t("myThreads.mediaEmptyTitle")}
                    </p>
                    <p className={styles.emptyText}>
                      {t("myThreads.mediaEmptyBody")}
                    </p>
                  </div>
                )
              )}
            </section>
          )}

          {activeTab === "mine" && (
          <section className={styles.feed}>
          {isInitialLoad && (
            <>
              <HomeFeedCardSkeleton variant="medium" />
              <HomeFeedCardSkeleton variant="short" />
              <HomeFeedCardSkeleton variant="long" />
            </>
          )}

          {showError && <HomeFeedErrorState error={error} onRetry={refetch} />}

          {showEmpty && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon} aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3.5 20.5 8 12 12.5 3.5 8 12 3.5Z" />
                  <path d="M3.5 12.5 12 17l8.5-4.5" />
                  <path d="M3.5 17 12 21.5 20.5 17" />
                </svg>
              </div>
              <p className={styles.emptyTitle}>{t("myThreads.emptyTitle")}</p>
              <p className={styles.emptyText}>{t("myThreads.emptyBody")}</p>
            </div>
          )}

          {!isInitialLoad && !error && posts.length > 0 && (
            <div
              className={cx(styles.feedItems, isReloading ? styles.feedItemsReloading : "")}
            >
              {posts.map((post, idx) => (
                <HomeFeedCard
                  key={post.uid}
                  post={post}
                  isLast={idx === posts.length - 1 && !hasMore}
                  onClick={() => handlePostClick(post)}
                  onHashtagClick={handleHashtagClick}
                  // Every thread here is the user's own — the "Your thread" tag
                  // would be redundant on this screen.
                  hideMineTag
                />
              ))}
            </div>
          )}

          </section>
          )}

          {/* Pagination sentinel — THREADS TAB ONLY. On the media tab the
              short/empty grid leaves the sentinel permanently in view, and
              the observer chain-loaded EVERY page of /threads/mine/ in one
              burst (the request storm). The gallery still grows with every
              page the threads tab loads. */}
          {activeTab === "mine" &&
            !isInitialLoad &&
            hasMore &&
            !isLoading &&
            !error &&
            !loadMoreError && (
              <div
                ref={sentinelRef}
                className={styles.sentinel}
                aria-hidden="true"
              />
            )}

          {isLoadingMore && !loadMoreError && <HomeFeedSpinner />}
          {loadMoreError && (
            <HomeFeedRetryBanner
              error={loadMoreError}
              onRetry={loadMore}
              isRetrying={isLoadingMore}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default MyThreads;
