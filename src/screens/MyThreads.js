import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HomeFeedCard from "../components/home/HomeFeedCard";
import HomeFeedCardSkeleton from "../components/home/HomeFeedCardSkeleton";
import HomeFeedSpinner from "../components/home/HomeFeedSpinner";
import HomeFeedErrorState from "../components/home/HomeFeedErrorState";
import HomeFeedRetryBanner from "../components/home/HomeFeedRetryBanner";
import MeProfileHeader from "../components/me/MeProfileHeader";
import { useMyThreads } from "../hooks/useMyThreads";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import usePageTitle from "../hooks/usePageTitle";
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
  usePageTitle("pageTitle.myThreads", { noindex: true });

  const {
    posts,
    totalCount,
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

  const handlePostClick = (postId) => {
    navigate(`/p/${postId}`);
  };

  const handleHashtagClick = (tag) => {
    const clean = String(tag).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(`#${clean}`)}`);
  };

  const isInitialLoad = isLoading && posts.length === 0;
  const isReloading = isLoading && posts.length > 0;
  const showEmpty = !isLoading && !error && posts.length === 0;
  const showError = !isLoading && error;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* Anonymous identity + private stats — /me only. The header already
            says "this is your space", so the old explanatory title is dropped
            in favour of a light divider with the real thread count below. */}
        <MeProfileHeader />

        {/* Light divider between the header and the list: lines icon + count +
            a thin rule. Informative, not an explanatory heading. */}
        {!isInitialLoad && !error && posts.length > 0 && (
          <div className={styles.listDivider}>
            <svg
              className={styles.listDividerIcon}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="8" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="8" y1="18" x2="20" y2="18" />
              <line x1="4" y1="6" x2="4" y2="6" />
              <line x1="4" y1="12" x2="4" y2="12" />
              <line x1="4" y1="18" x2="4" y2="18" />
            </svg>
            <span className={styles.listDividerCount}>
              {t("myThreads.threadCount", { count: totalCount || posts.length })}
            </span>
            <span className={styles.listDividerLine} aria-hidden="true" />
          </div>
        )}

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
              className={`${styles.feedItems} ${
                isReloading ? styles.feedItemsReloading : ""
              }`}
            >
              {posts.map((post, idx) => (
                <HomeFeedCard
                  key={post.uid}
                  post={post}
                  isLast={idx === posts.length - 1 && !hasMore}
                  onClick={() => handlePostClick(post.uid)}
                  onHashtagClick={handleHashtagClick}
                  // Every thread here is the user's own — the "Your thread" tag
                  // would be redundant on this screen.
                  hideMineTag
                />
              ))}
            </div>
          )}

          {hasMore && !isLoading && !error && !loadMoreError && (
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
        </section>
      </main>
    </div>
  );
}

export default MyThreads;
