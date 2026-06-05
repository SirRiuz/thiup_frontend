import { useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
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
import { useTagPosts } from "../hooks/useTagPosts";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import styles from "../styles/screens/SearchNew.module.css";

function SearchNew() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const tag = searchParams.get("tag") || "";

  const mode = query ? "query" : tag ? "tag" : "none";

  // Nota: la preservación/restauración de scroll la maneja el scroll manager
  // global (ScrollToTop, por location.key) — aquí no hay lógica de scroll.

  // -- Query mode (real, backend) --------------------------------------------
  // El hook se llama siempre (regla de hooks); en modo tag recibe "" => no-op.
  const {
    activeTab,
    loadedTab,
    selectTab,
    results,
    counts,
    countsReady,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    loadMore,
    refetch,
  } = useSearch(mode === "query" ? query : "");

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore || !!loadMoreError,
  });

  // Máximo GLOBAL de actividad entre los tags visibles → escala compartida de
  // los sparklines: un pico de 4 posts se ve 4× más alto que un pico de 1.
  // El ", 1" evita división por cero cuando toda la actividad es 0. Para
  // resultados sin activity (posts/users) el flatMap da [] y queda 1.
  const tagsActivityMax = useMemo(
    () =>
      Math.max(
        ...results.flatMap((t) => (Array.isArray(t.activity) ? t.activity : [])),
        1
      ),
    [results]
  );

  // -- Tag mode (real, backend): posts con el tag EXACTO -----------------------
  // Mismo patrón que el query mode; en modo query recibe "" => no-op.
  const {
    sortBy,
    selectSort,
    posts: tagPosts,
    totalCount: tagTotalCount,
    countReady: tagCountReady,
    isLoading: tagIsLoading,
    isLoadingMore: tagIsLoadingMore,
    error: tagError,
    loadMoreError: tagLoadMoreError,
    hasMore: tagHasMore,
    loadMore: tagLoadMore,
    refetch: tagRefetch,
  } = useTagPosts(mode === "tag" ? tag : "");

  const tagSentinelRef = useInfiniteScroll({
    onLoadMore: tagLoadMore,
    hasMore: tagHasMore,
    isLoading: tagIsLoading || tagIsLoadingMore || !!tagLoadMoreError,
  });

  // Scroll-to-top al cambiar tab/sort, igual que /home: smooth y DESPUÉS de
  // que los resultados nuevos carguen. La marca se pone SOLO en el click del
  // usuario (no observando el state): así un POP que restaura tab/sort del
  // cache nunca dispara el scroll — la restauración de posición queda intacta.
  const justSwitchedRef = useRef(false);

  const handleSelectTab = (tab) => {
    justSwitchedRef.current = true;
    selectTab(tab);
  };

  const handleSelectSort = (newSort) => {
    justSwitchedRef.current = true;
    selectSort(newSort);
  };

  useEffect(() => {
    if (!justSwitchedRef.current) return;
    const settled =
      mode === "query"
        ? !isLoading && results.length > 0
        : mode === "tag"
        ? !tagIsLoading && tagPosts.length > 0
        : false;
    if (settled) {
      window.scrollTo({ top: 0, behavior: "smooth" }); // mismo smooth que /home
      justSwitchedRef.current = false;
    }
  }, [mode, isLoading, results, tagIsLoading, tagPosts]);

  const handleHashtagClick = (tagName) => {
    navigate(`/search?tag=${encodeURIComponent(tagName)}`);
  };

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  const handleTagCardClick = (tagName) => {
    navigate(`/search?tag=${encodeURIComponent(tagName)}`);
  };

  const handleUserCardClick = (maskId) => {
    console.log("view user profile:", maskId);
  };

  // Loading diferenciado, igual que el feed: sin resultados => skeletons;
  // con resultados (cambio de tab) => dim. loadedTab evita mezclar shapes.
  const isInitialLoad = mode === "query" && isLoading && results.length === 0;
  const isReloading = mode === "query" && isLoading && results.length > 0;
  const showError = mode === "query" && !isLoading && !!error;
  const showResults = mode === "query" && !isInitialLoad && !error && totalCount > 0;
  const showEmpty =
    mode === "query" && !isLoading && !error && totalCount === 0;

  // Tag mode: mismos estados derivados (skeletons initial / dim al cambiar sort).
  const isTagInitialLoad = mode === "tag" && tagIsLoading && tagPosts.length === 0;
  const isTagReloading = mode === "tag" && tagIsLoading && tagPosts.length > 0;
  const showTagError = mode === "tag" && !tagIsLoading && !!tagError;
  const showTagResults =
    mode === "tag" && !isTagInitialLoad && !tagError && tagPosts.length > 0;
  const showTagEmpty =
    mode === "tag" && !tagIsLoading && !tagError && tagPosts.length === 0;

  const totalResults = mode === "query" ? totalCount : tagTotalCount;
  // El 'N results' del app bar: visible mientras los counts pertenezcan a la
  // búsqueda actual (countsReady). Cambiar de tab o de sort NO lo oculta —
  // los counts son globales de la query y se mantienen estables (sin
  // parpadeo). Solo una query/tag NUEVO lo oculta hasta su primera respuesta.
  const showCount =
    mode === "query"
      ? countsReady && !error
      : mode === "tag"
      ? tagCountReady && !tagError
      : false;

  // Guard: /search sin ?q= ni ?tag= (URL editada a mano — ningún flujo de la
  // app llega aquí sin param) no es una pantalla — a /home de inmediato, en
  // el RENDER (sin flash; los hooks con "" no fetchean) y con replace.
  if (mode === "none") {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className={styles.page}>
      <SearchAppBar
        mode={mode}
        query={query}
        tag={tag}
        totalResults={totalResults}
        showCount={showCount}
      />
      <main className={styles.main}>
        {mode === "query" && (
          <>
            {isInitialLoad && (
              <section className={styles.results}>
                <HomeFeedCardSkeleton variant="medium" />
                <HomeFeedCardSkeleton variant="short" />
                <HomeFeedCardSkeleton variant="long" />
              </section>
            )}

            {showError && (
              <HomeFeedErrorState error={error} onRetry={refetch} />
            )}

            {showEmpty && (
              <SearchEmptyState onBackToFeed={() => navigate("/home")} />
            )}

            {showResults && (
              <>
                {/* Mismo HomeFilterBar del feed: idéntico comportamiento
                    (spinner en la tab activa, dim de inactivas, transiciones).
                    counts => muestra 'posts 120 / tags 1 / users 0' y
                    deshabilita tabs en 0. */}
                <HomeFilterBar
                  label={null}
                  options={["posts", "tags", "users"]}
                  value={activeTab}
                  onChange={handleSelectTab}
                  counts={counts}
                  isLoading={isReloading}
                />
                <section
                  className={`${styles.results} ${
                    isReloading ? styles.resultsReloading : ""
                  }`}
                >
                  {loadedTab === "posts" &&
                    results.map((post, idx) => (
                      <HomeFeedCard
                        key={post.uid}
                        post={post}
                        isLast={idx === results.length - 1 && !hasMore}
                        onClick={() => handlePostClick(post.uid)}
                        onHashtagClick={handleHashtagClick}
                        highlightQuery={query}
                      />
                    ))}
                  {loadedTab === "tags" &&
                    results.map((t) => (
                      <SearchTagCard
                        key={t.name}
                        tag={t}
                        activityMax={tagsActivityMax}
                        highlightQuery={query}
                        onClick={() => handleTagCardClick(t.name)}
                      />
                    ))}
                  {loadedTab === "users" &&
                    results.map((u) => (
                      <SearchUserCard
                        key={u.maskId}
                        user={u}
                        highlightQuery={query}
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

        {mode === "tag" && (
          <>
            {isTagInitialLoad && (
              <section className={styles.results}>
                <HomeFeedCardSkeleton variant="medium" />
                <HomeFeedCardSkeleton variant="short" />
                <HomeFeedCardSkeleton variant="long" />
              </section>
            )}

            {showTagError && (
              <HomeFeedErrorState error={tagError} onRetry={tagRefetch} />
            )}

            {showTagEmpty && (
              <SearchEmptyState onBackToFeed={() => navigate("/home")} />
            )}

            {showTagResults && (
              <>
                {/* Mismo HomeFilterBar de /home (mismo archivo): opciones
                    trending/newest/oldest, spinner y animación idénticos.
                    label=null: en modo tag no se muestra el "feed". */}
                <HomeFilterBar
                  value={sortBy}
                  onChange={handleSelectSort}
                  isLoading={tagIsLoading}
                  label={null}
                />
                <section
                  className={`${styles.results} ${
                    isTagReloading ? styles.resultsReloading : ""
                  }`}
                >
                  {tagPosts.map((post, idx) => (
                    <HomeFeedCard
                      key={post.uid}
                      post={post}
                      isLast={idx === tagPosts.length - 1 && !tagHasMore}
                      onClick={() => handlePostClick(post.uid)}
                      onHashtagClick={handleHashtagClick}
                      activeTag={tag}
                    />
                  ))}
                </section>

                {tagHasMore &&
                  !tagIsLoading &&
                  !tagError &&
                  !tagLoadMoreError && (
                    <div
                      ref={tagSentinelRef}
                      className={styles.sentinel}
                      aria-hidden="true"
                    />
                  )}
                {tagIsLoadingMore && !tagLoadMoreError && <HomeFeedSpinner />}
                {tagLoadMoreError && (
                  <HomeFeedRetryBanner
                    error={tagLoadMoreError}
                    onRetry={tagLoadMore}
                    isRetrying={tagIsLoadingMore}
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
