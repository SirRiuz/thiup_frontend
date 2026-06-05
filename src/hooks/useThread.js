import { useState, useEffect, useRef, useCallback } from "react";

import {
  getThreadById,
  getThreadReplies,
  createReply as createReplyRequest,
} from "../api/threadApi";
import { getReactions, createReaction } from "../api/reactionApi";
import {
  mapBackendThreadToFrontend,
  mapBackendRepliesToFrontend,
  mapBackendReplyToFrontend,
} from "../api/mappers/threadMapper";
import { toggleReaction as applyToggle } from "../components/post/reactionUtils";
import {
  addInteraction,
  extractTags,
  tagsForContent,
  AFFINITY_WEIGHTS,
} from "../utils/affinity";
import { useThreadCache } from "../contexts/ThreadCacheContext";
import { buildDraftJsContent } from "../utils/draftjs";

/**
 * Resuelve el id de backend del tipo de reacción clickeado. El picker usa ids
 * semánticos ("fire", "seen", …), pero el POST /reactions/ necesita el id real.
 *   1. Si el emoji ya está en el post, su reacción trae el id de backend.
 *   2. Si no, lo buscamos en el catálogo (/reactions/) por emoji o por name.
 * Devuelve null si no se puede resolver (sin catálogo y emoji nuevo).
 */
function resolveReactionId(clicked, post, catalog) {
  const onPost = (post.reactions || []).find(
    (r) => r.emoji === clicked.emoji && r.id != null && r.id !== clicked.id
  );
  if (onPost) return onPost.id;
  const cat = (catalog || []).find(
    (c) =>
      c.emoji === clicked.emoji ||
      c.name === clicked.id ||
      c.name === clicked.label
  );
  return cat ? cat.id : null;
}

/**
 * Encapsula todo el state del thread de /post/:id/.
 *
 * Es un hook local (no Context global como FeedContext) porque cada visita a un
 * thread es un fetch fresco e independiente — no hay nada que persistir entre
 * navegaciones. Pero el patrón interno anti-race (requestIdRef), el cache
 * busting y el manejo de errores se replican exactos de FeedContext.
 *
 * @param {string} threadId  uid del thread (de useParams).
 * @returns {{
 *   thread: object|null, replies: object[],
 *   isLoading: boolean, isLoadingMore: boolean, isCreatingReply: boolean,
 *   createReplyError: Error|null, hasMore: boolean, error: Error|null,
 *   createReply: Function, loadMore: Function, retry: Function
 * }}
 */
// Mapea la opción de sort de la UI al query param `ordering` del backend.
// Mismas etiquetas y mapeo que buildOrderingParam de FeedContext (/home-new):
// trending/newest/oldest.
function buildReplyOrdering(sortBy) {
  switch (sortBy) {
    case "newest":
      return "-create_at";
    case "oldest":
      return "create_at";
    case "trending":
    default:
      return "-reactions_count";
  }
}

// Inserta un reply nuevo en la posición correcta de la lista plana (que está en
// orden DFS: cada parent seguido de su subtree). Un sub-reply se inserta DESPUÉS
// del subtree completo de su parent → queda agrupado bajo él como el hermano más
// reciente, NO al final de todo el thread. Un reply de primer nivel va al final
// (comportamiento previo). Maneja profundidad arbitraria.
function insertReply(list, newReply) {
  const parentId = newReply.parentId;
  if (!parentId) return [...list, newReply];

  const parentIdx = list.findIndex((r) => r.id === parentId);
  if (parentIdx === -1) return [...list, newReply]; // fallback defensivo

  // Los descendientes del parent son contiguos en DFS: avanzamos mientras el
  // siguiente item cuelgue de algún id ya visto del subtree.
  const subtree = new Set([parentId]);
  let insertAt = parentIdx + 1;
  while (insertAt < list.length && subtree.has(list[insertAt].parentId)) {
    subtree.add(list[insertAt].id);
    insertAt += 1;
  }
  return [...list.slice(0, insertAt), newReply, ...list.slice(insertAt)];
}

export function useThread(threadId) {
  const { getCachedThread, setCachedThread } = useThreadCache();

  // Lazy init desde el cache: si volvemos (POP) a un thread ya visitado, el
  // contenido está presente en el PRIMER render. Esto es lo que permite que el
  // browser restaure el scroll de forma nativa (igual que /home-new): si el
  // contenido apareciera recién en un effect, el body tendría altura 0 en el
  // primer paint y la restauración fallaría.
  const initialCache = getCachedThread(threadId);

  const [thread, setThread] = useState(() => initialCache?.thread || null);
  const [replies, setReplies] = useState(() => initialCache?.replies || []);
  const [isLoading, setIsLoading] = useState(
    () => !(initialCache && initialCache.thread)
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCreatingReply, setIsCreatingReply] = useState(false);
  const [createReplyError, setCreateReplyError] = useState(null);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(() =>
    Boolean(initialCache?.hasMore)
  );
  const [refetchKey, setRefetchKey] = useState(0);

  // Sorting de replies (trending/newest/oldest), igual que selectSort de FeedContext.
  const [sortBy, setSortBy] = useState(
    () => initialCache?.sortBy || "trending"
  );
  // sortKey fuerza el refetch incluso al re-clickear la misma opción (igual que
  // el refetchKey del FeedContext). isReloadingReplies = recarga por sort con
  // replies ya visibles → dim, NO skeletons.
  const [sortKey, setSortKey] = useState(0);
  const [isReloadingReplies, setIsReloadingReplies] = useState(false);
  // Ref del sortBy actual: el fetch effect lo lee sin añadir sortBy a sus deps
  // (evita doble disparo y closures stale). Marca si el próximo run del effect
  // es un cambio de sort (dim) vs una navegación/retry (skeleton + cache).
  const sortByRef = useRef(sortBy);
  const isSortChangeRef = useRef(false);

  // next de DRF: ref en vez de state porque no necesita causar re-render.
  const nextUrlRef = useRef(initialCache?.nextUrl || null);
  // Counter incremental anti-race: cada initial fetch obtiene un id único y
  // solo el más reciente escribe state / apaga isLoading. (Igual que FeedContext.)
  const requestIdRef = useRef(0);
  // Catálogo de tipos de reacción (emoji ↔ id de backend), cargado una vez.
  const reactionCatalogRef = useRef([]);
  // postIds con un toggle de reacción en vuelo — guard anti doble-click.
  const togglingRef = useRef(new Set());
  // Evita escribir state tras desmontar (await del POST de reacción en curso).
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Espejo de `replies` para leer el estado actual fuera de los updaters de
  // setState (createReply necesita ubicar el parent sin meter `replies` en sus
  // deps, que lo recrearía en cada cambio).
  const repliesRef = useRef(replies);
  useEffect(() => {
    repliesRef.current = replies;
  }, [replies]);

  // Tags del hilo RAÍZ (perfil de afinidad client-side): ref para que los
  // callbacks (createReply, toggleReaction) los lean sin closures stale.
  // Reaccionar/comentar un reply también alimenta los tags del hilo raíz —
  // la señal de interés es sobre el tema del hilo.
  const threadTagsRef = useRef([]);
  useEffect(() => {
    threadTagsRef.current = thread ? extractTags(thread.text) : [];
  }, [thread]);

  // Catálogo de reacciones: una sola carga por montaje del hook. Sin cache
  // busting agresivo (cambia rarísimo); fallo silencioso (las reacciones ya
  // presentes en el post igual traen su id de backend).
  useEffect(() => {
    const controller = new AbortController();
    getReactions({ signal: controller.signal })
      .then((list) => {
        reactionCatalogRef.current = list || [];
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Fetch del thread — corre al montar, al cambiar threadId, al retry(), y al
  // cambiar el sort (selectSort bumpea sortKey).
  useEffect(() => {
    if (!threadId) return undefined;

    // ¿Este run es un cambio de sort? (lo marca selectSort). Lo consumimos aquí.
    const isSortChange = isSortChangeRef.current;
    isSortChangeRef.current = false;

    // CACHE HIT: thread ya visitado → restaurar sin re-fetch (causa raíz del bug
    // al volver). Solo en navegación: un sort change SIEMPRE refetchea (reordena
    // fresco) y retry() nunca cachea errores.
    if (!isSortChange) {
      const cached = getCachedThread(threadId);
      if (cached && cached.thread) {
        setThread(cached.thread);
        setReplies(cached.replies || []);
        setHasMore(Boolean(cached.hasMore));
        nextUrlRef.current = cached.nextUrl || null;
        if (cached.sortBy) {
          setSortBy(cached.sortBy);
          sortByRef.current = cached.sortBy;
        }
        setError(null);
        setIsLoading(false);
        return undefined;
      }
    }

    // FETCH FRESH (anti-race con requestIdRef + cache busting + ordering). En un
    // sort change usamos isReloadingReplies (dim, replies visibles); si no,
    // isLoading (skeletons en initial load). El sync effect persiste al cache.
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();

    if (isSortChange) {
      setIsReloadingReplies(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    async function fetchThread() {
      try {
        const data = await getThreadById(threadId, {
          signal: controller.signal,
          ordering: buildReplyOrdering(sortByRef.current),
        });
        if (requestId !== requestIdRef.current) return;
        const mapped = mapBackendThreadToFrontend(data);
        setThread(mapped.thread);
        setReplies(mapped.replies);
        nextUrlRef.current = mapped.next;
        setHasMore(Boolean(mapped.next));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err && err.name === "AbortError") return;
        // En un sort change conservamos los replies actuales (solo se quita el
        // dim); el error state full-screen es solo para la carga inicial.
        if (!isSortChange) {
          setError(err);
          setThread(null);
          setReplies([]);
          setHasMore(false);
          nextUrlRef.current = null;
        }
      } finally {
        // Solo el request más reciente apaga los flags de carga.
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsReloadingReplies(false);
        }
      }
    }

    fetchThread();
    return () => controller.abort();
  }, [threadId, refetchKey, sortKey, getCachedThread]);

  // selectSort: cambia el sort y SIEMPRE dispara un refetch (incluso al
  // re-clickear la misma opción), igual que selectSort de FeedContext.
  const selectSort = useCallback((newSort) => {
    setSortBy(newSort);
    sortByRef.current = newSort;
    isSortChangeRef.current = true;
    setSortKey((k) => k + 1);
  }, []);

  // Sync del cache: cada vez que cambia el thread cargado (fetch, loadMore,
  // createReply, toggleReaction optimista) escribimos la foto actual al cache,
  // indexada por threadId. Así, al volver, el contenido —incluidos replies
  // paginados y reacciones— está disponible al instante. Un solo punto de
  // escritura evita olvidar sincronizar en alguna mutación concreta.
  useEffect(() => {
    if (!threadId || !thread) return;
    setCachedThread(threadId, {
      thread,
      replies,
      hasMore,
      nextUrl: nextUrlRef.current,
      sortBy,
    });
  }, [threadId, thread, replies, hasMore, sortBy, setCachedThread]);

  const loadMore = useCallback(async () => {
    // Guard: no paginar sin next, ni con un fetch (inicial o de paginación)
    // ya en vuelo.
    if (!nextUrlRef.current || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      const data = await getThreadReplies(nextUrlRef.current);
      const additions = mapBackendRepliesToFrontend(data.results);
      setReplies((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...additions.filter((r) => !seen.has(r.id))];
      });
      nextUrlRef.current = data.next || null;
      setHasMore(Boolean(data.next));
    } catch (err) {
      // La paginación falla en silencio: el usuario puede reintentar el click.
      // El botón vuelve a aparecer porque hasMore sigue true.
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoading]);

  /**
   * Crea una respuesta. parentId = threadId para un comment directo, o el id de
   * un reply para un sub-comment. Bottom-insert al success, replicando el
   * legacy (onRefreshThread hace threads.concat(nuevo)). Preserva el texto en
   * error (re-lanza para que PostCommentBox no limpie el textarea).
   */
  const createReply = useCallback(
    async ({ parentId, text }) => {
      const trimmed = (text || "").trim();
      if (!trimmed) throw new Error("Text cannot be empty");

      const targetParentId = parentId || threadId;
      setIsCreatingReply(true);
      setCreateReplyError(null);
      try {
        const created = await createReplyRequest({
          parentId: targetParentId,
          text: trimmed,
          content: buildDraftJsContent(trimmed),
        });

        // Un sub-reply (parentId distinto del thread) se etiqueta con su parent
        // para que la UI lo indente y muestre "re: <mask>". El parent se ubica
        // vía repliesRef (estado actual) para poder mapear fuera del updater y
        // retornar el reply nuevo (lo usa Post.js para scroll + highlight).
        const isSubReply = targetParentId !== threadId;
        const parent = isSubReply
          ? repliesRef.current.find((r) => r.id === targetParentId)
          : null;
        const mapped = mapBackendReplyToFrontend(created, {
          parentId: isSubReply ? targetParentId : null,
          parentMaskId: parent?.mask?.id || null,
        });
        // Inserción POSICIONAL: agrupa el sub-reply bajo su parent (no al final
        // del thread). insertReply respeta el orden DFS de la lista plana.
        setReplies((prev) =>
          prev.some((r) => r.id === mapped.id) ? prev : insertReply(prev, mapped)
        );
        // Solo en el path de éxito: el reply (directo o sub) cuenta como una
        // respuesta del thread → +1 al total que muestra el app bar. Vive en
        // thread.replyCount, así que el sync effect lo persiste al cache solo.
        setThread((t) =>
          t ? { ...t, replyCount: (t.replyCount ?? 0) + 1 } : t
        );
        // Afinidad (client-side, solo localStorage): comentar es la señal
        // más fuerte de interés. Se registran los tags del contenido AL
        // QUE se responde: un reply de cualquier nivel (parent, resuelto
        // arriba desde la lista plana) o el hilo raíz para comentarios
        // directos. Reply sin tags → fallback a los del hilo.
        addInteraction(
          parent
            ? tagsForContent(parent.text, threadTagsRef.current)
            : threadTagsRef.current,
          AFFINITY_WEIGHTS.comment
        );
        return mapped;
      } catch (err) {
        setCreateReplyError(err);
        throw err;
      } finally {
        setIsCreatingReply(false);
      }
    },
    [threadId]
  );

  /**
   * Togglea la reacción del current user sobre un post (thread o reply).
   * Optimistic update inmediato + POST /reactions/ + rollback en error.
   * postId puede ser thread.id o el id de un reply. clicked = { id, emoji, label }.
   */
  const toggleReaction = useCallback(
    async (postId, clicked) => {
      if (!postId || !clicked) return;
      // Guard anti doble-click: ignora si ya hay un toggle en vuelo para este post.
      if (togglingRef.current.has(postId)) return;

      // Localiza el post (thread principal o un reply) y snapshot para rollback.
      const isThread = thread && thread.id === postId;
      const target = isThread ? thread : replies.find((r) => r.id === postId);
      if (!target) return; // no encontrado (o thread aún cargando)

      const reactionId = resolveReactionId(
        clicked,
        target,
        reactionCatalogRef.current
      );
      if (reactionId == null) {
        // Sin id de backend no podemos persistir → no hacemos un optimistic
        // que no se podría guardar.
        // eslint-disable-next-line no-console
        console.warn("No backend reaction id for emoji:", clicked.emoji);
        return;
      }

      // Snapshot del estado previo (para rollback) y cálculo del nuevo estado.
      const prevReactions = target.reactions;
      const prevCUR = target.currentUserReaction ?? null;
      const nextReactions = applyToggle(prevReactions, clicked);
      const nextCUR = nextReactions.find((r) => r.userReacted)?.emoji ?? null;

      const writePost = (reactions, currentUserReaction) => {
        if (isThread) {
          setThread((t) =>
            t && t.id === postId ? { ...t, reactions, currentUserReaction } : t
          );
        } else {
          setReplies((rs) =>
            rs.map((r) =>
              r.id === postId ? { ...r, reactions, currentUserReaction } : r
            )
          );
        }
      };

      // 1. Optimistic: la UI se actualiza al instante.
      togglingRef.current.add(postId);
      writePost(nextReactions, nextCUR);

      try {
        // 2. Persistir. El backend decide add/switch/remove según el estado del user.
        await createReaction({ reactionId, postId });
        // Afinidad (client-side, solo localStorage): cuenta solo al AÑADIR
        // una reacción nueva (nextCUR pasa de null/otro emoji a este) — un
        // toggle-off (quitar la reacción) no es señal de interés.
        // Se registran los tags del CONTENIDO reaccionado: el hilo o el
        // reply de CUALQUIER nivel (target ya está resuelto arriba, venga
        // de la lista plana de replies o sea el hilo raíz). Reply sin
        // tags → fallback a los del hilo (señal sobre el tema).
        if (nextCUR && nextCUR !== prevCUR) {
          addInteraction(
            tagsForContent(target.text, threadTagsRef.current),
            AFFINITY_WEIGHTS.reaction
          );
        }
      } catch (err) {
        // 3. Rollback silencioso — es una micro-interacción, sin banner intrusivo.
        if (isMountedRef.current) writePost(prevReactions, prevCUR);
        // eslint-disable-next-line no-console
        console.warn("Reaction failed, rolled back:", err);
      } finally {
        togglingRef.current.delete(postId);
      }
    },
    [thread, replies]
  );

  // Re-dispara el initial fetch bumpeando refetchKey (igual que FeedContext).
  const retry = useCallback(() => setRefetchKey((k) => k + 1), []);

  return {
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
  };
}
