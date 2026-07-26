import { useMemo, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "../hooks/useIsMobile";
import HomeFilterBar from "../components/home/HomeFilterBar";
import HomeFeedCard from "../components/home/HomeFeedCard";
import HomeFeedCardSkeleton from "../components/home/HomeFeedCardSkeleton";
import HomeFeedSpinner from "../components/home/HomeFeedSpinner";
import HomeFeedErrorState from "../components/home/HomeFeedErrorState";
import HomeFeedRetryBanner from "../components/home/HomeFeedRetryBanner";
import SearchMediaPreview from "../components/search/SearchMediaPreview";
import SearchEmptyState from "../components/search/SearchEmptyState";
import SearchTagCard from "../components/search/SearchTagCard";
import SearchUserCard from "../components/search/SearchUserCard";
import { useSearch } from "../hooks/useSearch";
import { useTagSuggestions } from "../hooks/useTagSuggestions";
import useMobileSurfacePage from "../hooks/useMobileSurfacePage";
import useFlushBottom from "../hooks/useFlushBottom";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import usePageTitle from "../hooks/usePageTitle";
import cx from "../utils/cx";
import {
  playTileVideoOnHover,
  stopTileVideoOnLeave,
} from "../components/media/mediaTileHoverPlay";
import {
  isTileMediaLoaded,
  markTileMediaLoaded,
} from "../services/media/tileMediaMemory";
import styles from "../styles/screens/SearchNew.module.css";
import { sanitizeQuery, MAX_QUERY_LENGTH } from "../utils/searchQuery";

// ONE fixed tab row (Twitter/X model), identical for any search — only the
// results change, never the controls. 'top'/'latest' are the two post orders
// (relevance vs chronological); 'people' = users; 'tags' = matching hashtags;
// 'media' = the gallery of files of matching threads.
const TABS = ["top", "latest", "people", "tags", "media"];
const TAB_I18N = {
  top: "search.tabTop",
  latest: "search.tabLatest",
  people: "search.tabPeople",
  tags: "search.tabTags",
  media: "search.tabMedia",
};
// The two tabs whose results are posts (rendered with HomeFeedCard).
const POST_TABS = new Set(["top", "latest"]);

// Explore topics — a CURATED starter cloud for the landing (tags are DATA,
// not UI copy: they stay as written in every locale). Static for now; when
// the backend ships topic aggregation this becomes its payload.
const EXPLORE_TOPICS = [
  "privacidad",
  "tecnologia",
  "salud",
  "musica",
  "viajes",
  "comida",
  "deportes",
  "cine",
  "libros",
  "ciencia",
  "gaming",
  "arte",
];

function SearchNew() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // ONE responsive layout (Threads' search column) at every breakpoint: a
  // 60px "Search" masthead + the search box INSIDE the surface, with LIVE
  // results as you type (the input debounces into ?q=, reusing the whole
  // URL-driven results machinery). The old mobile SearchAppBar is gone.
  const isMobile = useIsMobile();
  // Mobile: the whole screen becomes one #fdfcf8 sheet (page + <html>/<body>/
  // AppShell), same canonical treatment as /home and /p/:id — no mismatched
  // warm strip on iOS elastic overscroll.
  const pageRef = useRef(null);
  useMobileSurfacePage(pageRef);

  // ?q= puede venir manipulado (URL pegada a mano gigante) → sanear antes
  // de usarlo en cualquier request. El backend igual valida (defensa real).
  const query = sanitizeQuery(searchParams.get("q") || "");
  const rawTab = searchParams.get("tab");
  const activeTab = TABS.includes(rawTab) ? rawTab : "top";
  const mode = query.trim() ? "query" : "none";

  // The leading '#' is tag-intent syntax (extractTagFromSearch), NOT part of
  // the searched term: typing or clicking '#tor' must highlight 'tor' inside
  // '#historia' too. Mirror of the strip in useSearch.
  const highlightTerm = query.trim().replace(/^#/, "");

  // Media tab: a real gallery search (type=media). Clicking a tile opens the
  // IG-style post preview seeded with the item's parent thread card — the
  // backend ships it with each media result, so no second request.
  const [mediaPreviewItem, setMediaPreview] = useState(null);
  const {
    loadedTab,
    results,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    refetch,
  } = useSearch(query, activeTab);

  // Search landing (the magnifier, no query): Threads-style suggestion list —
  // the precomputed TRENDING tags. Empty prefix = one cached request; the
  // first visit shows row skeletons while it flies.
  const { trending = [], isLoading: isTrendingLoading } = useTagSuggestions("");
  const showTrendingSkeleton =
    mode === "none" && isTrendingLoading && trending.length === 0;

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

  // Same shared scale for the landing's trending sparklines (their real
  // series arrive with the suggest payload): a peak of 4 reads 4× a peak
  // of 1 across the whole list.
  const trendingActivityMax = useMemo(
    () =>
      Math.max(
        ...trending.flatMap((t) =>
          Array.isArray(t.activity) ? t.activity : []
        ),
        1
      ),
    [trending]
  );

  // A hashtag is just a normal search: navigate to /search?q=#tag (default tab)
  // and land on THESE same tabs — no special tag mode.
  const searchHashtag = (tagName) => {
    const clean = String(tagName).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(sanitizeQuery(`#${clean}`))}`);
  };

  // === Desktop live search: local input → debounced ?q= (replace) ===
  // The URL stays the single source of truth (tabs, cache, deep links);
  // typing just feeds it. External URL changes (back/forward, hashtag click)
  // sync DOWN into the input.
  const [inputValue, setInputValue] = useState(query);
  const lastCommittedRef = useRef(query);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query !== lastCommittedRef.current) {
      lastCommittedRef.current = query;
      setInputValue(query);
    }
  }, [query]);

  const commitQuery = (value) => {
    const clean = sanitizeQuery(value).trim();
    lastCommittedRef.current = clean;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (clean) next.set("q", clean);
        else next.delete("q");
        return next;
      },
      { replace: true } // typing must not flood the history
    );
  };

  const handleType = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitQuery(value), 350);
  };

  const handleTypeKeyDown = (e) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      commitQuery(inputValue);
    }
  };

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  // Seed the thread view with the card's already-loaded post (router state):
  // the OP paints instantly there — only the replies show a loading state.
  const handlePostClick = (post) =>
    navigate(`/p/${post.uid}`, { state: { seedThread: post } });
  const handleUserCardClick = (maskId) => {
    // The anonymous public profile (People results carry the public id).
    navigate(`/m/${maskId}`);
  };

  // Differentiated loading. THE RULE: skeletons ONLY for the very first load
  // of a query (nothing loaded yet, loadedTab === null); ANY tab switch shows
  // the spinner treatment instead — dimmed previous results when there are
  // some, the centered spinner when the previous tab was empty (skeletons on
  // tab play read as a full reload and felt inconsistent).
  const isTabSwitchLoad =
    mode === "query" &&
    isLoading &&
    loadedTab != null &&
    loadedTab !== activeTab;
  const isInitialLoad =
    mode === "query" &&
    isLoading &&
    results.length === 0 &&
    !isTabSwitchLoad;
  const isReloading = mode === "query" && isLoading && !isInitialLoad;
  const showError = mode === "query" && !isLoading && !!error;
  const showEmpty =
    mode === "query" &&
    !isLoading &&
    !error &&
    results.length === 0 &&
    loadedTab === activeTab;
  const showResults =
    mode === "query" &&
    !isInitialLoad &&
    !error &&
    results.length > 0;

  // Flush-into-the-corners only when the mosaic REALLY reaches the card's
  // bottom: the surface is min-height stretched, so a short last page ends
  // mid-card — rounding those tiles read broken.
  const surfaceRef = useRef(null);
  const mediaGridRef = useRef(null);
  const mediaGridFlush = useFlushBottom(
    mediaGridRef,
    surfaceRef,
    activeTab === "media" && showResults && !hasMore,
    results.length
  );

  return (
    <div className={styles.page} ref={pageRef}>
      {/* Threads' search masthead: 60px solid bar, centered "Search" title
          (their column header with empty side slots) — every breakpoint. */}
      <header className={styles.appBar}>
        <div className={styles.appBarInner}>
          <h1 className={styles.mastheadTitle}>{t("pageTitle.search")}</h1>
        </div>
      </header>
      {/* Sticky corner mask (desktop): pins the surface card's rounded top
          under the 60px masthead — same anatomy as home/thread. */}
      {!isMobile && (
        <div className={styles.cornerMask} aria-hidden="true">
          <div className={styles.cornerMaskEdge} />
          <div className={cx(styles.cornerCap, styles.cornerCapLeft)}>
            <div className={styles.cornerCapBox} />
          </div>
          <div className={cx(styles.cornerCap, styles.cornerCapRight)}>
            <div className={styles.cornerCapBox} />
          </div>
        </div>
      )}
      <main className={styles.main}>
        <div className={styles.surface} ref={surfaceRef}>
            {/* Threads' in-card search box — magnifier + input in a rounded
                recessed field, ONE responsive field at every breakpoint.
                Typing updates the results LIVE (the debounced commit above). */}
            <div className={styles.searchBox}>
              <svg
                className={styles.searchBoxIcon}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7.5" />
                <line x1="21" y1="21" x2="16.4" y2="16.4" />
              </svg>
              <input
                className={styles.searchBoxInput}
                type="search"
                value={inputValue}
                maxLength={MAX_QUERY_LENGTH}
                onChange={handleType}
                onKeyDown={handleTypeKeyDown}
                placeholder={t("search.placeholder")}
                aria-label={t("search.label")}
                autoComplete="off"
                spellCheck="false"
                /* Landing arrival: type right away (deep links with ?q=
                   keep their scroll — no focus steal). Skipped on mobile:
                   auto-opening the software keyboard on navigation is
                   hostile there. */
                autoFocus={mode === "none" && !isMobile}
              />
            </div>
            {mode === "query" && (
              <>
            {/* The SAME tab row regardless of what is searched (word or
                hashtag). Same component/tokens as For You / Close You. NO
                count badges: with five equal cells they threw the labels
                off-center — the labels sit clean, Threads-style. */}
            <HomeFilterBar
              label={null}
              options={TABS}
              value={activeTab}
              onChange={setTabParam}
              isLoading={isReloading}
              getOptionLabel={(option) => t(TAB_I18N[option])}
            />

            {isInitialLoad &&
              (activeTab === "media" ? (
                /* Media first load: the ghost mosaic IS the skeleton — the
                   same tile anatomy as the real grid, so nothing jumps when
                   the results land. */
                <section className={styles.mediaSection} aria-hidden="true">
                  <div className={styles.mediaGrid}>
                    {Array.from({ length: 9 }, (_, i) => (
                      <div key={i} className={styles.mediaTile} />
                    ))}
                  </div>
                </section>
              ) : (
                <section className={styles.results}>
                  <HomeFeedCardSkeleton variant="medium" />
                  <HomeFeedCardSkeleton variant="short" />
                  <HomeFeedCardSkeleton variant="long" />
                </section>
              ))}

            {/* Tab switch landing on an empty previous list: nothing to dim,
                so the centered spinner carries the load (never skeletons). */}
            {isTabSwitchLoad && results.length === 0 && <HomeFeedSpinner />}

            {showError && <HomeFeedErrorState error={error} onRetry={refetch} />}

            {showEmpty && (
              <SearchEmptyState />
            )}

            {showResults && (
              <>
                <section
                  className={cx(styles.results, isReloading ? styles.resultsReloading : "")}
                >
                  {POST_TABS.has(loadedTab) &&
                    results.map((post, idx) => (
                      <HomeFeedCard
                        key={post.uid}
                        post={post}
                        isLast={idx === results.length - 1 && !hasMore}
                        onClick={() => handlePostClick(post)}
                        // Conversation preview → the reply's own permalink
                        // (same seeded navigation; the reply IS a post shape).
                        onReplyClick={handlePostClick}
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
                  {/* Media — Threads' tight mosaic with the REAL gallery:
                      images lazy-load per tile (loading="lazy"), pages
                      lazy-load through the same sentinel as every tab. The
                      dominant color paints the tile while the file arrives
                      (no white flash); NSFW tiles stay blurred in the grid. */}
                  {loadedTab === "media" && (
                    /* mediaGridEnd (last page only): the mosaic runs FLUSH
                       into the card's rounded bottom corners — while more
                       pages exist the sentinel/spinner need the room. */
                    <div
                      ref={mediaGridRef}
                      className={cx(styles.mediaGrid, mediaGridFlush ? styles.mediaGridEnd : "")}
                    >
                      {results.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={cx(styles.mediaTile, m.isNsfw ? styles.mediaTileNsfw : "")}
                          style={
                            m.dominantColor
                              ? {
                                  background: m.dominantColor.startsWith("#")
                                    ? m.dominantColor
                                    : `#${m.dominantColor}`,
                                }
                              : undefined
                          }
                          /* Straight to the thread (seeded — same behavior
                             as the profile grids); the URL keeps ?tab=media
                             and the results are cached, so BACK restores
                             this exact tab + scroll. The SearchMediaPreview
                             modal stays available but unused for now. */
                          onClick={() =>
                            m.thread
                              ? handlePostClick(m.thread)
                              : setMediaPreview(m)
                          }
                          onMouseEnter={playTileVideoOnHover}
                          onMouseLeave={stopTileVideoOnLeave}
                          aria-label={t("myThreads.mediaTileLabel")}
                        >
                          {m.type === "video" ? (
                            <video
                              className={styles.mediaTileMedia}
                              src={m.url}
                              preload="metadata"
                              muted
                              playsInline
                              loop
                            />
                          ) : (
                            <img
                              className={styles.mediaTileMedia}
                              src={m.url}
                              alt=""
                              /* No-blink restore — see the profile grids. */
                              loading={
                                isTileMediaLoaded(m.url) ? "eager" : "lazy"
                              }
                              decoding="sync"
                              onLoad={() => markTileMediaLoaded(m.url)}
                            />
                          )}
                          {/* ONE type mark per tile (IG's grid rule), top-
                              right, same raw-glyph treatment: carousel wins
                              when the thread has more media; otherwise a
                              lone video shows IG's exact Reel glyph. */}
                          {m.mediaCount > 1 ? (
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
                          ) : m.type === "video" ? (
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
                          {m.isNsfw && (
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
                  )}
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
            {/* First visit: trending row skeletons (rank · tile · two bars),
                warm pulse — same anatomy as the real rows, so nothing jumps. */}
            {showTrendingSkeleton && (
              <>
                <h2 className={styles.trendingTitle}>
                  {t("search.trendingTitle")}
                </h2>
                <section
                  className={cx(styles.results, styles.trendSkeleton)}
                  aria-hidden="true"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className={styles.trendSkeletonRow}>
                      <span
                        className={cx(styles.skeletonBar, styles.trendSkeletonRank)}
                      />
                      <span
                        className={cx(styles.skeletonBar, styles.trendSkeletonTile)}
                      />
                      <span className={styles.trendSkeletonText}>
                        <span
                          className={cx(styles.skeletonBar, styles.trendSkeletonName)}
                        />
                        <span
                          className={cx(styles.skeletonBar, styles.trendSkeletonMeta)}
                        />
                      </span>
                      <span
                        className={cx(styles.skeletonBar, styles.trendSkeletonArrow)}
                      />
                    </div>
                  ))}
                </section>
              </>
            )}

            {/* Landing (no query) — Threads-style suggestions: the trending
                tags as quiet rows with the INSET divider (their suggestion-
                list anatomy). Tapping one runs that hashtag search. */}
            {mode === "none" && !showTrendingSkeleton && trending.length > 0 && (
              <>
                <h2 className={styles.trendingTitle}>
                  {t("search.trendingTitle")}
                </h2>
                <section className={styles.results}>
                  {trending.map((tg, i) => (
                    <SearchTagCard
                      key={tg.name}
                      tag={{
                        name: tg.name,
                        postsCount: tg.count ?? 0,
                        // REAL posts/day series from the suggest payload —
                        // drives the row's sparkline.
                        activity: tg.activity,
                      }}
                      variant="suggestion"
                      rank={i + 1}
                      activityMax={trendingActivityMax}
                      onClick={() => searchHashtag(tg.name)}
                    />
                  ))}
                </section>
              </>
            )}

            {/* Explore topics — the curated chip cloud: a second door into
                the app for landings where the trends alone read flat.
                Tapping a topic runs that hashtag search. */}
            {mode === "none" && !showTrendingSkeleton && (
              <>
                <h2 className={styles.trendingTitle}>
                  {t("search.topicsTitle")}
                </h2>
                <div className={styles.topicChips}>
                  {EXPLORE_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      className={styles.topicChip}
                      onClick={() => searchHashtag(topic)}
                    >
                      <span className={styles.topicChipHash} aria-hidden="true">
                        #
                      </span>
                      {topic}
                    </button>
                  ))}
                </div>
              </>
            )}
        </div>
      </main>
      {/* IG-style post preview (Media tab): the tapped file + its parent
          thread, already shipped with the search result. "View thread" seeds
          /p/:uid with the card (instant OP), like a feed card click. */}
      {mediaPreviewItem && (
        <SearchMediaPreview
          item={mediaPreviewItem}
          onClose={() => setMediaPreview(null)}
          onViewThread={(thread) => {
            setMediaPreview(null);
            handlePostClick(thread);
          }}
          onHashtag={(tag) => {
            // A hashtag in the preview text runs THAT search (the modal's
            // job is done — it closes and the results pivot to the tag).
            setMediaPreview(null);
            searchHashtag(tag);
          }}
        />
      )}
    </div>
  );
}

export default SearchNew;
