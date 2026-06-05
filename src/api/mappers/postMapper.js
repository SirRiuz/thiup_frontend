/**
 * Transforma un thread del shape del backend al shape que espera HomeFeedCard.
 *
 * Backend response shape (de apps/threads/serializers/thread_serializer.py):
 *   {
 *     uid, text, content, create_at,
 *     mask: { id, hash, country_code, miniature },
 *     reactions: [{ id, name, emoji, reaction_count }, ...],
 *     responses_count, reactions_count, last_reaction, media,
 *     is_new, is_op, sub, parent
 *   }
 *
 * Nota: el backend ya no expone el UUID `id` ni `short_id` para los hilos.
 * El identificador público del hilo es ahora `uid` (12 chars), y el retrieve
 * (/post/:id, /threads/<uid>/) se resuelve por uid.
 */
/**
 * Resuelve qué reacción tiene el current user en el post, desde `last_reaction`.
 * El backend lo expone como objeto de reacción (ver legacy ReactionBox, que usa
 * last_reaction.id). Devolvemos el emoji para que la UI (PostReactionPill.active,
 * picker highlight) lo compare contra cada reacción. Defensivo ante variaciones
 * de shape: emoji directo, string, o resolución por id contra el array.
 */
function resolveCurrentUserReaction(backendPost) {
  const lr = backendPost.last_reaction;
  if (!lr) return null;
  if (typeof lr === "string") return lr;
  if (lr.emoji) return lr.emoji;
  const match = (backendPost.reactions || []).find((r) => r.id === lr.id);
  return match?.emoji || null;
}

export function mapBackendPostToFrontend(backendPost) {
  const maskDisplayId = (backendPost.mask?.hash || "").slice(0, 6);

  const currentUserReaction = resolveCurrentUserReaction(backendPost);

  const reactions = (backendPost.reactions || [])
    .map((r) => ({
      id: r.id,
      emoji: r.emoji,
      name: r.name,
      count: r.reaction_count,
      // userReacted marca la reacción activa del current user (modelo Facebook:
      // a lo sumo una). Persiste el highlight de la pill tras un reload.
      userReacted: currentUserReaction != null && r.emoji === currentUserReaction,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    currentUserReaction,
    uid: backendPost.uid,
    // El backend ya no retorna el UUID `id`; el identificador público es `uid`.
    id: backendPost.uid,
    shortId: backendPost.uid,
    mask: {
      id: maskDisplayId,
      fullHash: backendPost.mask?.hash,
      countryCode: backendPost.mask?.country_code,
    },
    text: backendPost.text || "",
    time: backendPost.create_at || "",
    // Momentum del motor For You. momentum_final = base × boost regional,
    // calculado POR CONSULTA en el backend (solo viene en el feed For
    // You); fallback al base persistido. Solo se muestra con DEBUG activo.
    momentum: backendPost.momentum_final ?? backendPost.momentum_score ?? null,
    isTrending: false,
    repliesCount: backendPost.responses_count ?? 0,
    viewsCount: 0,
    reactions,
    isOp: backendPost.is_op ?? true,
  };
}
