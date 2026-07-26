import { useEffect, useRef } from "react";
import cx from "../utils/cx";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import HomeFeedCard from "../components/home/HomeFeedCard";
import HomeFilterBar from "../components/home/HomeFilterBar";
import HomeFeedCardSkeleton from "../components/home/HomeFeedCardSkeleton";
import HomeFeedSpinner from "../components/home/HomeFeedSpinner";
import HomeFeedErrorState from "../components/home/HomeFeedErrorState";
import HomeFeedRetryBanner from "../components/home/HomeFeedRetryBanner";
import AnonProfileHeader from "../components/me/AnonProfileHeader";
import { useAnonThreads } from "../hooks/useAnonThreads";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { useCurrentUser } from "../contexts/CurrentUserContext";
import BrandLogo from "../components/BrandLogo";
import usePageTitle from "../hooks/usePageTitle";
import useMobileSurfacePage from "../hooks/useMobileSurfacePage";
import useFlushBottom from "../hooks/useFlushBottom";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  playTileVideoOnHover,
  stopTileVideoOnLeave,
} from "../components/media/mediaTileHoverPlay";
import {
  isTileMediaLoaded,
  markTileMediaLoaded,
} from "../services/media/tileMediaMemory";
import styles from "../styles/screens/MyThreads.module.css";

// The public mask id: exactly 6 lowercase hex chars (the backend's contract).
const MASK_ID_RE = /^[0-9a-f]{6}$/;

/**
 * /m/:maskId — an anonymous user's PUBLIC profile (m = mask, mirroring /p/:id; legacy /anon/:maskId redirects here): the same canonical
 * surface screen and Threads profile anatomy as /profile (it reuses that
 * screen's stylesheet verbatim), fed by public data only — /users/<id>/
 * (joined + posts/replies counts) and the search's author filter for the
 * thread list. Viewing your OWN mask redirects to /profile (the richer,
 * private version).
 */
function AnonProfile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { maskId: rawMaskId } = useParams();
  const maskId = MASK_ID_RE.test((rawMaskId || "").toLowerCase())
    ? rawMaskId.toLowerCase()
    : null;
  const pageRef = useRef(null);
  const location = useLocation();
  const isMobile = useIsMobile();
  usePageTitle("pageTitle.anonProfile", { noindex: true });
  useMobileSurfacePage(pageRef);

  // Back — the thread app bar's exact logic: normal history back; a direct
  // entry (no in-app history) falls back to /home.
  const handleBack = () => {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/home", { replace: true });
    }
  };

  // Your own mask → /profile (the private version, with reactions + You badge).
  const { currentUserMask } = useCurrentUser();
  useEffect(() => {
    if (maskId && currentUserMask?.id && maskId === currentUserMask.id) {
      navigate("/profile", { replace: true });
    }
  }, [maskId, currentUserMask, navigate]);

  const {
    posts,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    refetch,
  } = useAnonThreads(maskId);

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore || !!loadMoreError,
  });

  const handlePostClick = (post) => {
    navigate(`/p/${post.uid}`, { state: { seedThread: post } });
  };

  const handleHashtagClick = (tag) => {
    const clean = String(tag).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(`#${clean}`)}`);
  };

  const isInitialLoad = isLoading && posts.length === 0;
  const showEmpty = !isLoading && !error && posts.length === 0;
  const showError = !isLoading && error;

  // Profile tabs (Threads' strip): Threads · Media — same derivation as /me
  // (one tile per thread, first file, from the loaded pages). The active tab
  // lives in the URL (?tab=media) so opening a thread and coming BACK
  // restores it (local state reset on remount and lost it).
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "media" ? "media" : "mine";
  const setActiveTab = (tab) => {
    if (tab === activeTab) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "media") next.set("tab", "media");
        else next.delete("tab");
        return next;
      },
      { replace: true }
    );
  };
  const mediaTiles = posts.flatMap((post) =>
    post.media && post.media.length > 0
      ? [{ post, file: post.media[0], count: post.media.length }]
      : []
  );

  // Flush-into-the-corners only when the mosaic REALLY reaches the card's
  // bottom (same measured treatment as /me and the search gallery).
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

  // The thread app bar's EXACT anatomy at every breakpoint (grid: back ·
  // centered title · balancing span). Only the back glyph splits: desktop =
  // Threads' floating circle, mobile = the plain 20px arrow.
  const appBar = (
    <header className={styles.profileAppBar}>
      <div className={styles.profileAppBarInner}>
        <button
          type="button"
          className={styles.profileBackButton}
          onClick={handleBack}
          aria-label={t("common.back")}
        >
          {isMobile ? (
            // Threads' exact mobile-header Back glyph (23px, stroke 2).
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="2.909" y1="12.004" x2="22.001" y2="12.004" />
              <polyline points="9.276 4.726 2.001 12.004 9.276 19.274" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 6h10M1 6l4-4M1 6l4 4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          )}
        </button>
        {isMobile ? (
          /* Mobile: centered 32px brand slot instead of the title — same
             anatomy as /profile and the thread view's mobile app bar. */
          <button
            type="button"
            className={styles.profileAppBarBrand}
            onClick={() => navigate("/home")}
            aria-label={t("nav.home")}
          >
            <BrandLogo size={32} variant="plain" fit="glyph" />
          </button>
        ) : (
          <span className={styles.profileAppBarTitle}>
            {t("pageTitle.anonProfile")}
          </span>
        )}
        {/* Balance spacer — no ☰ here: /m/:maskId is a drill-in (Back on the
            left), and the app menu already lives on the top-level screens. */}
        <span aria-hidden="true" />
      </div>
    </header>
  );

  // A malformed id renders the plain empty shell (no requests fired).
  if (!maskId) {
    return (
      <div className={styles.page} ref={pageRef}>
        <main className={styles.main}>
          {appBar}
          <div className={styles.surface}>
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>{t("profile.notFound")}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page} ref={pageRef}>
      <main className={styles.main}>
        {appBar}
        <div className={styles.cornerMask} aria-hidden="true">
          <div className={styles.cornerMaskEdge} />
          <div className={cx(styles.cornerCap, styles.cornerCapLeft)}>
            <div className={styles.cornerCapBox} />
          </div>
          <div className={cx(styles.cornerCap, styles.cornerCapRight)}>
            <div className={styles.cornerCapBox} />
          </div>
        </div>

        <div className={styles.surface} ref={surfaceRef}>
          <AnonProfileHeader maskId={maskId} />

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
                      {t("profile.mediaEmptyTitle")}
                    </p>
                    <p className={styles.emptyText}>
                      {t("profile.mediaEmptyBody")}
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

              {showError && (
                <HomeFeedErrorState error={error} onRetry={refetch} />
              )}

              {showEmpty && (
                <div className={styles.emptyState}>
                  <p className={styles.emptyTitle}>
                    {t("profile.emptyTitle")}
                  </p>
                  <p className={styles.emptyText}>{t("profile.emptyBody")}</p>
                </div>
              )}

              {!isInitialLoad && !error && posts.length > 0 && (
                <div className={styles.feedItems}>
                  {posts.map((post, idx) => (
                    <HomeFeedCard
                      key={post.uid}
                      post={post}
                      isLast={idx === posts.length - 1 && !hasMore}
                      onClick={() => handlePostClick(post)}
                      // Conversation preview → the reply's own permalink
                      // (same seeded navigation; the reply IS a post shape).
                      onReplyClick={handlePostClick}
                      onHashtagClick={handleHashtagClick}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Pagination sentinel — THREADS TAB ONLY (on the media tab the
              short grid keeps it in view and it chain-loads every page). */}
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

export default AnonProfile;
