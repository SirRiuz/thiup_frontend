import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import MaskAvatar from "../components/MaskAvatar";
import PostCommentBox from "../components/post/PostCommentBox";
import PostEndDivider from "../components/post/PostEndDivider";
import PostLoadMoreButton from "../components/post/PostLoadMoreButton";
// PostMoreMenu (los tres puntos) oculto temporalmente — se usará más adelante.
// import PostMoreMenu from "../components/post/PostMoreMenu";
import PostProfileTrigger from "../components/post/PostProfileTrigger";
import PostReactionPicker from "../components/post/PostReactionPicker";
import PostReactionPill from "../components/post/PostReactionPill";
import PostInitialSkeleton from "../components/post/PostInitialSkeleton";
import PostReply from "../components/post/PostReply";
import PostReplySkeleton from "../components/post/PostReplySkeleton";
import PostThreadNotFound from "../components/post/PostThreadNotFound";
import PostSortMenu from "../components/post/PostSortMenu";
import { useThread } from "../hooks/useThread";
import {
  addInteraction,
  extractTags,
  AFFINITY_WEIGHTS,
  DWELL_THRESHOLD_MS,
} from "../utils/affinity";
import { useCurrentUser } from "../contexts/CurrentUserContext";
import { useScrollLock } from "../utils/scrollLock";
import { renderTextWithHashtags } from "../components/home/homeHelpers";
import styles from "../styles/screens/Post.module.css";

function Post() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Usuario actual REAL (de /me/): un solo request global, cacheado en el
  // contexto — aquí solo se consume.
  const { currentUserMask } = useCurrentUser();

  // 'Go back' robusto ante deep links: location.key === "default" es la señal
  // idiomática de React Router v6 de PRIMERA entrada de la sesión (entrada
  // directa, sin historial interno) — navigate(-1) no tendría destino, así
  // que caemos a /home. Con historial: back normal (preserva el scroll del
  // feed/search vía el scroll manager). Mismo patrón que el ← de /search.
  const handleBack = () => {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/home", { replace: true });
    }
  };

  const {
    thread,
    replies,
    isLoading,
    isLoadingMore,
    isReloadingReplies,
    isCreatingReply,
    createReplyError,
    hasMore,
    error,
    sortBy,
    selectSort,
    createReply,
    loadMore,
    retry,
    toggleReaction,
  } = useThread(id);

  const [replyingTo, setReplyingTo] = useState(null);
  // Reply recién creado: lo scrolleamos a la vista y lo resaltamos ~3s.
  const [highlightedReplyId, setHighlightedReplyId] = useState(null);
  const commentBoxRef = useRef(null);
  const repliesSectionRef = useRef(null);

  // Auto-scroll a la sección de replies tras un cambio de sort exitoso (en el
  // thread no tiene sentido ir al top del documento: scrolleamos a donde
  // empiezan los replies). Replica el justSwitchedRef de HomeNew.
  const previousSortByRef = useRef(sortBy);
  const justSwitchedRef = useRef(false);

  useEffect(() => {
    if (previousSortByRef.current !== sortBy) {
      justSwitchedRef.current = true;
      previousSortByRef.current = sortBy;
    }
  }, [sortBy]);

  useEffect(() => {
    if (justSwitchedRef.current && !isReloadingReplies) {
      repliesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      justSwitchedRef.current = false;
    }
  }, [isReloadingReplies]);

  // ── Dwell time (perfil de afinidad client-side) ──────────────────────
  // Si el usuario pasa > DWELL_THRESHOLD_MS con el thread VISIBLE, cuenta
  // como "lo leyó" → señal débil de interés en sus tags. Page Visibility
  // pausa el conteo con la pestaña en background (cambiar de pestaña y
  // volver a la hora no es leer). Abrir-y-salir rápido no suma nada.
  //
  // El thread carga async: los tags se leen de un ref que se actualiza al
  // llegar. Keyed por `id` — navegar entre posts (mismo componente, param
  // distinto) cierra el dwell del post anterior en el cleanup, sin timers
  // ni listeners colgados.
  const dwellTagsRef = useRef([]);
  useEffect(() => {
    dwellTagsRef.current = thread ? extractTags(thread.text) : [];
  }, [thread]);

  useEffect(() => {
    let visibleMs = 0;
    let visibleSince = document.hidden ? null : Date.now();

    const onVisibility = () => {
      if (document.hidden) {
        // A background: acumular el tramo visible y pausar.
        if (visibleSince != null) {
          visibleMs += Date.now() - visibleSince;
          visibleSince = null;
        }
      } else if (visibleSince == null) {
        // De vuelta al foreground: reanudar el conteo.
        visibleSince = Date.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (visibleSince != null) {
        visibleMs += Date.now() - visibleSince;
      }
      if (visibleMs >= DWELL_THRESHOLD_MS) {
        addInteraction(dwellTagsRef.current, AFFINITY_WEIGHTS.dwell);
      }
    };
  }, [id]);

  // El hook es la única fuente de verdad. Las reacciones se actualizan
  // optimísticamente DENTRO del hook (toggleReaction + rollback en error), así
  // que aquí solo renderizamos su state. Aliases por legibilidad del JSX.
  const post = thread;
  const displayReplies = replies;

  // Total de replies del backend (DRF count, ya mapeado a thread.replyCount).
  // Vacío mientras carga; plural-aware una vez resuelto el thread.
  const replyCount = post?.replyCount ?? 0;
  // La lista local cubre el primer reply recién creado (count aún 0).
  const hasReplies = replyCount > 0 || replies.length > 0;
  const repliesLabel = !post
    ? ""
    : replyCount === 0
    ? "No replies yet"
    : replyCount === 1
    ? "1 reply"
    : `${replyCount} replies`;

  // Scroll lock durante el initial loading — el comment box no aparece,
  // así que tampoco queremos que el usuario haga scroll a un layout vacío.
  // Usa el scroll-lock centralizado (contador): coexiste con el splash sin
  // pisarse (antes, restaurar aquí podía dejar el body en 'hidden' eterno).
  useScrollLock(isLoading && !thread);

  // Hashtag click → búsqueda por tag, idéntico a /home.
  const handleHashtagClick = (tag) => {
    navigate(`/search?tag=${encodeURIComponent(tag)}`);
  };

  const handleReplyClick = (target) => {
    setReplyingTo(target);
    setTimeout(() => {
      commentBoxRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Crea comment/sub-comment. parentId = thread.id para comment directo, o el
  // id del reply al que se responde (replyingTo.sourceId) para sub-comment.
  // Resetea replyingTo solo si el POST tuvo éxito (createReply re-lanza en error).
  const handleSubmitReply = async ({ parentId, text }) => {
    const newReply = await createReply({ parentId: parentId || thread?.id, text });
    setReplyingTo(null);
    // El reply nuevo dispara scroll-to + highlight (ver effect abajo).
    if (newReply?.id) setHighlightedReplyId(newReply.id);
  };

  // Tras crear un reply: scroll suave hacia él (ya en el DOM) y limpiar el
  // highlight a los 3s (la animación CSS lo desvanece sola). rAF asegura que el
  // nodo nuevo está commiteado antes del scroll; cleanup evita fugas/saltos.
  useEffect(() => {
    if (!highlightedReplyId) return undefined;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-reply-id="${highlightedReplyId}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timer = setTimeout(() => setHighlightedReplyId(null), 3000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [highlightedReplyId]);

  // Guard: sin id no hay hilo que mostrar — a /home de inmediato, en el
  // RENDER (sin flash ni fetch: useThread sin id no fetchea) y con replace
  // (la URL inválida no queda en el historial). Tras los hooks (regla).
  if (!id) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.appBar}>
        <div className={styles.appBarInner}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label="Back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className={styles.titleBlock}>
            <span className={styles.title}>Thread</span>
            {repliesLabel && (
              <span className={styles.subtitle}>{repliesLabel}</span>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
      {error && !post && error.status === 404 ? (
        <PostThreadNotFound threadId={id || post?.id} />
      ) : error && !post ? (
        <div className={styles.errorState} role="alert">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9b9591"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.7a3 3 0 0 0-2.5-4.7 5.5 5.5 0 0 0-10.6-1.5" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
          <p className={styles.errorText}>This thread could not be loaded.</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={retry}
          >
            retry
          </button>
        </div>
      ) : !post ? (
        <PostInitialSkeleton />
      ) : (
        <>
      <section className={styles.opSection}>
        <div className={styles.opHeader}>
          <PostProfileTrigger mask={post.mask}>
            <MaskAvatar seed={post.mask.id} size={32} />
            <div className={styles.opMetaCol}>
              <span className={styles.opMaskId}>{post.mask.id}</span>
              <span className={styles.opMetaLine}>
                posted {post.time} ago
              </span>
            </div>
          </PostProfileTrigger>
        </div>

        <p className={styles.opBody}>
          {renderTextWithHashtags(post.text, styles.hashtag, handleHashtagClick)}
        </p>

        <div className={styles.opReactions}>
          {post.reactions.map((r) => (
            <PostReactionPill
              key={r.emoji}
              emoji={r.emoji}
              count={r.count}
              active={r.userReacted}
              variant="op"
              onClick={() =>
                toggleReaction(post.id, {
                  id: r.id || r.emoji,
                  emoji: r.emoji,
                  label: r.label || r.emoji,
                })
              }
            />
          ))}
          <PostReactionPicker
            contextId={post.id}
            currentReactionEmoji={post.currentUserReaction}
            onSelect={(reaction) => toggleReaction(post.id, reaction)}
          />
        </div>

        <div className={styles.opActions}>
          <button
            type="button"
            className={styles.actionActive}
            onClick={() =>
              handleReplyClick({
                maskId: post.mask.id,
                type: "op",
                sourceId: post.id,
              })
            }
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            reply
          </button>
          <span className={styles.spacer} />
          {/* Oculto temporalmente — se usará más adelante:
          <PostMoreMenu maskId={post.mask.id} /> */}
        </div>
      </section>

      {/* Sin replies: ni separador, ni sort, ni mensaje — solo un espaciado
          limpio entre el post principal y la caja de comentarios. */}
      {hasReplies ? (
        <>
          <div
            ref={repliesSectionRef}
            className={styles.repliesSeparator}
            role="separator"
          >
            <span className={styles.repliesSeparatorLine} />
            <span className={styles.repliesSeparatorLabel}>replies</span>
            <span className={styles.repliesSeparatorLine} />
          </div>

          <PostSortMenu
            value={sortBy}
            onChange={selectSort}
            isLoading={isReloadingReplies}
          />
        </>
      ) : (
        <div className={styles.noRepliesGap} aria-hidden="true" />
      )}

      <section
        className={`${styles.repliesList} ${
          isReloadingReplies ? styles.repliesListReloading : ""
        }`}
      >
        {displayReplies.map((reply, index) => {
          // isLastInChain: la línea vertical de threading se extiende para
          // empalmar con el siguiente sub-reply, EXCEPTO en el último de la
          // cadena (cuando el siguiente item ya no es un sub-reply, o no hay).
          const next = displayReplies[index + 1];
          const isLastInChain =
            Boolean(reply.parentId) && !(next && next.parentId);
          return (
          <PostReply
            key={reply.id}
            {...reply}
            // Sin border solo en el último reply cuando ya no hay más páginas:
            // así conecta limpio con PostEndDivider. Con 'load more' visible
            // (hasMore), el último visible conserva su border.
            isLast={index === displayReplies.length - 1 && !hasMore}
            isLastInChain={isLastInChain}
            isHighlighted={reply.id === highlightedReplyId}
            onHashtagClick={handleHashtagClick}
            onReaction={(reaction) => toggleReaction(reply.id, reaction)}
            onReplyClick={() =>
              handleReplyClick({
                maskId: reply.mask.id,
                type: "reply",
                sourceId: reply.id,
              })
            }
          />
          );
        })}
        {isLoadingMore && (
          <>
            <PostReplySkeleton variant="medium" />
            <PostReplySkeleton variant="short" />
            <PostReplySkeleton variant="long" />
          </>
        )}
      </section>

      {hasMore && !isLoadingMore && <PostLoadMoreButton onClick={loadMore} />}

      {!hasMore && displayReplies.length > 0 && <PostEndDivider />}

      <div ref={commentBoxRef}>
        <PostCommentBox
          thread={post}
          currentUserMask={currentUserMask}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          onSubmit={handleSubmitReply}
          isSubmitting={isCreatingReply}
          submitError={createReplyError}
        />
      </div>
        </>
      )}
      </main>
    </div>
  );
}

export default Post;
