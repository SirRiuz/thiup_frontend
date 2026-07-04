import { useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HomeFilterBar from "../components/home/HomeFilterBar";
import HomeFeedCard from "../components/home/HomeFeedCard";
import HomeFeedCardSkeleton from "../components/home/HomeFeedCardSkeleton";
import HomeFeedSpinner from "../components/home/HomeFeedSpinner";
import HomeFeedErrorState from "../components/home/HomeFeedErrorState";
import HomeFeedRetryBanner from "../components/home/HomeFeedRetryBanner";
import SearchAppBar from "../components/search/SearchAppBar";
import SearchEmptyState from "../components/search/SearchEmptyState";
import SearchTagCard from "../components/search/SearchTagCard";
import SearchUserCard from "../components/search/SearchUserCard";
import { useSearch } from "../hooks/useSearch";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import usePageTitle from "../hooks/usePageTitle";
import { formatCompactNumber } from "../utils/formatNumber";
import styles from "../styles/screens/SearchNew.module.css";
import { sanitizeQuery } from "../utils/searchQuery";

// ONE fixed tab row (Twitter/X model), identical for any search — only the
// results change, never the controls. 'top'/'latest' are the two post orders
// (relevance vs chronological); 'people' = users; 'tags' = matching hashtags.
const TABS = ["top", "latest", "people", "tags"];
const TAB_I18N = {
  top: "search.tabTop",
  latest: "search.tabLatest",
  people: "search.tabPeople",
  tags: "search.tabTags",
};
// The two tabs whose results are posts (rendered with HomeFeedCard).
const POST_TABS = new Set(["top", "latest"]);

function SearchNew() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ?q= puede venir manipulado (URL pegada a mano gigante) → sanear antes
  // de usarlo en cualquier request. El backend igual valida (defensa real).
  const query = sanitizeQuery(searchParams.get("q") || "");
  const rawTab = searchParams.get("tab");
  const activeTab = TABS.includes(rawTab) ? rawTab : "top";
  const mode = query.trim() ? "query" : "none";

  // The leading '#' is tag-intent syntax (extractTagFromSearch), NOT part of
  // the searched term: typing or clicking '#tor' must highlight 'tor' inside
  // '#historia' too. Mirror of the strip in SearchSuggestions/useSearch.
  const highlightTerm = query.trim().replace(/^#/, "");

  const {
    loadedTab,
    results,
    counts,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    refetch,
  } = useSearch(query, activeTab);

  // Per-tab count badges (Twitter-style). top/latest share the matching-posts
  // total (same set, different order); people = users; tags = hashtags. Null
  // while a new query loads → badges hidden (no placeholder / no false 0).
  const tabCounts = counts
    ? {
        top: counts.posts,
        latest: counts.posts,
        people: counts.users,
        tags: counts.tags,
      }
    : undefined;

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore || !!loadMoreError,
  });

  // Título de pestaña estilo X: "<query> - Search / Thiup" ("-" antes de la
  // página, "/" antes de la marca). Sin query (pantalla de búsqueda vacía) cae
  // a "Search / Thiup". La ruta sigue noindex — esto solo afecta la pestaña/
  // historial del navegador, no el SEO ni el share.
  usePageTitle("pageTitle.search", {
    noindex: true,
    prefix: query,
    prefixSeparator: "-",
    separator: "/",
  });

  // Invalid ?tab=zzz → drop it (default 'top'); preserve ?q=.
  useEffect(() => {
    if (rawTab && !TABS.includes(rawTab)) {
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
  }, [rawTab]);

  // Scroll-to-top after a tab switch settles (smooth), same as /home. The flag
  // is set ONLY on the user's click — not by observing state — so a POP that
  // restores a tab from cache never triggers the scroll.
  const justSwitchedRef = useRef(false);
  const setTabParam = (tab) => {
    if (tab === activeTab) return;
    justSwitchedRef.current = true;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        // 'top' is the default — keep the URL clean (no ?tab=top).
        if (tab === "top") next.delete("tab");
        else next.set("tab", tab);
        return next;
      },
      { replace: true } // switching tab doesn't fill the history
    );
  };

  useEffect(() => {
    if (!justSwitchedRef.current) return;
    if (!isLoading && results.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      justSwitchedRef.current = false;
    }
  }, [isLoading, results]);

  // GLOBAL max activity across the visible tags → shared sparkline scale.
  const tagsActivityMax = useMemo(
    () =>
      Math.max(
        ...results.flatMap((r) => (Array.isArray(r.activity) ? r.activity : [])),
        1
      ),
    [results]
  );

  // A hashtag is just a normal search: navigate to /search?q=#tag (default tab)
  // and land on THESE same tabs — no special tag mode.
  const searchHashtag = (tagName) => {
    const clean = String(tagName).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(sanitizeQuery(`#${clean}`))}`);
  };

  const handlePostClick = (postId) => navigate(`/p/${postId}`);
  const handleUserCardClick = (maskId) => {
    // Placeholder: user profile screen not built yet.
    console.log("view user profile:", maskId);
  };

  // Differentiated loading (by loadedTab, so shapes never mix): no results =>
  // skeletons; results present (tab change) => dim.
  const isInitialLoad = mode === "query" && isLoading && results.length === 0;
  const isReloading = mode === "query" && isLoading && results.length > 0;
  const showError = mode === "query" && !isLoading && !!error;
  const showEmpty =
    mode === "query" &&
    !isLoading &&
    !error &&
    results.length === 0 &&
    loadedTab === activeTab;
  const showResults =
    mode === "query" && !isInitialLoad && !error && results.length > 0;

  return (
    <div className={styles.page}>
      <SearchAppBar mode={mode} query={query} />
      <main className={styles.main}>
        {mode === "query" && (
          <>
            {/* The SAME tab row regardless of what is searched (word or
                hashtag). Same component/tokens as For You / Close You; no
                counts (Twitter-style). */}
            <HomeFilterBar
              label={null}
              options={TABS}
              value={activeTab}
              onChange={setTabParam}
              isLoading={isReloading}
              counts={tabCounts}
              getOptionLabel={(option) => t(TAB_I18N[option])}
              getOptionAriaLabel={(option, count) =>
                typeof count === "number" && count > 0
                  ? t("search.tabWithCount", {
                      label: t(TAB_I18N[option]),
                      countLabel: formatCompactNumber(count),
                    })
                  : t(TAB_I18N[option])
              }
            />

            {isInitialLoad && (
              <section className={styles.results}>
                <HomeFeedCardSkeleton variant="medium" />
                <HomeFeedCardSkeleton variant="short" />
                <HomeFeedCardSkeleton variant="long" />
              </section>
            )}

            {showError && <HomeFeedErrorState error={error} onRetry={refetch} />}

            {showEmpty && (
              <SearchEmptyState />
            )}

            {showResults && (
              <>
                <section
                  className={`${styles.results} ${
                    isReloading ? styles.resultsReloading : ""
                  }`}
                >
                  {POST_TABS.has(loadedTab) &&
                    results.map((post, idx) => (
                      <HomeFeedCard
                        key={post.uid}
                        post={post}
                        isLast={idx === results.length - 1 && !hasMore}
                        onClick={() => handlePostClick(post.uid)}
                        onHashtagClick={searchHashtag}
                        highlightQuery={highlightTerm}
                      />
                    ))}
                  {loadedTab === "tags" &&
                    results.map((tg) => (
                      <SearchTagCard
                        key={tg.name}
                        tag={tg}
                        activityMax={tagsActivityMax}
                        highlightQuery={highlightTerm}
                        onClick={() => searchHashtag(tg.name)}
                      />
                    ))}
                  {loadedTab === "people" &&
                    results.map((u) => (
                      <SearchUserCard
                        key={u.maskId}
                        user={u}
                        highlightQuery={highlightTerm}
                        onClick={() => handleUserCardClick(u.maskId)}
                      />
                    ))}
                </section>

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
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default SearchNew;
