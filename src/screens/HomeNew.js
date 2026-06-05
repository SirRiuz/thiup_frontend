import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HomeTopBar from "../components/home/HomeTopBar";
import HomeCompose from "../components/home/HomeCompose";
import HomeFilterBar from "../components/home/HomeFilterBar";
import CloseYouGate from "../components/home/CloseYouGate";
import CloseYouRadiusBar from "../components/home/CloseYouRadiusBar";
import HomeFeedCard from "../components/home/HomeFeedCard";
import HomeFeedCardSkeleton from "../components/home/HomeFeedCardSkeleton";
import HomeFeedSpinner from "../components/home/HomeFeedSpinner";
import HomeFeedEndDivider from "../components/home/HomeFeedEndDivider";
import HomeFeedEmptyState from "../components/home/HomeFeedEmptyState";
import HomeFeedErrorState from "../components/home/HomeFeedErrorState";
import HomeFeedRetryBanner from "../components/home/HomeFeedRetryBanner";
import { useFeedContext } from "../contexts/FeedContext";
import { useCurrentUser } from "../contexts/CurrentUserContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import styles from "../styles/screens/HomeNew.module.css";

function HomeNew() {
  const composeRef = useRef(null);
  const navigate = useNavigate();
  // Usuario actual REAL (de /me/): un solo request global, cacheado en el
  // contexto — aquí solo se consume.
  const { currentUserMask } = useCurrentUser();

  const {
    posts,
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

  // Tabs del home: For You (default) y Close You. HomeFilterBar se reusa
  // tal cual (mismo patrón que search) — labels visibles ↔ keys internas.
  const TAB_LABELS = { foryou: "for you", closeyou: "close you" };
  const LABEL_TO_TAB = { "for you": "foryou", "close you": "closeyou" };

  // ── El query param ?tab= es la FUENTE DE VERDAD del tab activo ──────
  // /home?tab=fy | /home?tab=cy — al recargar, el tab se reconstruye
  // de la URL. TODOS los cambios de tab escriben la URL (clicks y el
  // "not now" del gate); el feedTab del contexto es un espejo que se
  // sincroniza URL → contexto en el effect de abajo (una sola dirección,
  // sin dobles verdades ni loops).
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTabParam = searchParams.get("tab");
  const urlTab = rawTabParam === "cy" ? "closeyou" : "foryou";

  // Patrón de transición suave de /search: la marca se pone SOLO en la
  // acción del usuario (click de tab / cambio de radio) — nunca
  // observando el state, así un POP que restaura ?tab= no dispara el
  // scroll y la restauración de posición queda intacta.
  const justSwitchedRef = useRef(false);

  const setTabParam = (tab) => {
    setSearchParams(
      (prev) => {
        // Preservar los demás query params: solo se toca `tab`.
        const next = new URLSearchParams(prev);
        next.set("tab", tab === "closeyou" ? "cy" : "fy");
        return next;
      },
      { replace: true } // cambiar de tab no llena el historial
    );
  };

  // Param inválido (?tab=zzz) → limpiar: /home sin param (el default
  // For You no necesita query). Los demás params se preservan.
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

  // URL → contexto: al recargar con ?tab=close (o al cambiar el param),
  // selectFeedTab corre igual que un click — incluido el flujo de
  // permiso de Close You (granted→feed, prompt→opt-in, denied→bloqueado).
  useEffect(() => {
    if (urlTab !== feedTab) {
      selectFeedTab(urlTab);
    }
  }, [urlTab, feedTab, selectFeedTab]);

  // ── Anti "flash of wrong state" ──────────────────────────────────────
  // Entre que la URL cambia a ?tab=cy y el effect sincroniza el contexto
  // hay UN render donde closeYouStatus aún es el valor VIEJO (p. ej.
  // "denied" de una visita anterior, aunque el permiso ya esté
  // concedido). Ese frame pintaba el mensaje de bloqueado — el flash.
  // Mientras el contexto no está sincronizado, el gate muestra SIEMPRE
  // el estado neutral "checking" (el "finding your area…" sutil, con su
  // icono pulsando) — nunca un mensaje que la comprobación async puede
  // contradecir un instante después.
  const closeYouSyncing = urlTab === "closeyou" && feedTab !== "closeyou";
  const gateStatus = closeYouSyncing ? "locating" : closeYouStatus;

  // El gate del Close You reemplaza el área del feed mientras no haya
  // celdas (checking / prompt / denied...) — el feed nunca se monta sin
  // el opt-in del lector.
  const showCloseYouGate =
    urlTab === "closeyou" &&
    (closeYouSyncing ||
      ["prompt", "locating", "denied", "error", "unsupported"].includes(
        closeYouStatus
      ));

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  // Entrada del contenido NUEVO tras un switch (tab/radio): animación de
  // duración FIJA (~240ms, CSS) atada al CAMBIO DE CONTENIDO — no al
  // estado loading. El dim atado a isLoading es invisible en localhost
  // (fetch ~30ms = 1-2 frames); esta animación se reproduce COMPLETA
  // aunque los datos lleguen instantáneos, sin ralentizar ningún fetch.
  const [isEntering, setIsEntering] = useState(false);
  const enterTimerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, []);

  // Settle del switch (scroll suave + enter fade) — useLayoutEffect: la
  // clase de entrada se aplica ANTES del paint del contenido nuevo (sin
  // frame intermedio a opacidad plena = sin flash).
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
        // Re-aplicable en cada switch: quitar la clase al terminar la
        // animación permite que el próximo switch la reinicie.
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

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  const handleHashtagClick = (tag) => {
    navigate(`/search?tag=${encodeURIComponent(tag)}`);
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
  const showEndDivider = !isLoading && !error && !hasMore && posts.length > 0;

  return (
    <div className={styles.page}>
      <HomeTopBar currentUserMask={currentUserMask} />
      <main className={styles.main}>
        <div ref={composeRef}>
          <HomeCompose
            currentUserMask={currentUserMask}
            isLoading={isInitialLoad}
          />
        </div>
        <HomeFilterBar
          value={TAB_LABELS[urlTab]}
          onChange={(label) => {
            justSwitchedRef.current = true;
            setTabParam(LABEL_TO_TAB[label]);
          }}
          isLoading={isLoading}
          options={["for you", "close you"]}
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
              className={`${styles.feedItems} ${
                isReloading ? styles.feedItemsReloading : ""
              } ${isEntering ? styles.feedItemsEntering : ""}`}
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
          {showEndDivider && <HomeFeedEndDivider />}
        </section>
      </main>
    </div>
  );
}

export default HomeNew;
