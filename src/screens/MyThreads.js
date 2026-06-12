import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HomeFeedCard from "../components/home/HomeFeedCard";
import HomeFeedCardSkeleton from "../components/home/HomeFeedCardSkeleton";
import HomeFeedSpinner from "../components/home/HomeFeedSpinner";
import HomeFeedEndDivider from "../components/home/HomeFeedEndDivider";
import HomeFeedErrorState from "../components/home/HomeFeedErrorState";
import HomeFeedRetryBanner from "../components/home/HomeFeedRetryBanner";
import { useMyThreads } from "../hooks/useMyThreads";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
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

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  const handleHashtagClick = (tag) => {
    const clean = String(tag).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(`#${clean}`)}`);
  };

  const isInitialLoad = isLoading && posts.length === 0;
  const isReloading = isLoading && posts.length > 0;
  const showEmpty = !isLoading && !error && posts.length === 0;
  const showError = !isLoading && error;
  const showEndDivider = !isLoading && !error && !hasMore && posts.length > 0;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t("myThreads.title")}</h1>
          <p className={styles.subtitle}>{t("myThreads.subtitle")}</p>
        </header>

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
          {showEndDivider && <HomeFeedEndDivider />}
        </section>
      </main>
    </div>
  );
}

export default MyThreads;
