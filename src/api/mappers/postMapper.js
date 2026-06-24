/**
 * Transforms a thread from the backend shape to the shape HomeFeedCard expects.
 *
 * Backend response shape (from apps/threads/serializers/thread_serializer.py):
 *   {
 *     uid, text, content, create_at,
 *     mask: { id, hash, country_code, miniature },
 *     reactions: [{ id, name, emoji, reaction_count }, ...],
 *     responses_count, reactions_count, last_reaction, media,
 *     is_new, is_op, sub, parent
 *   }
 *
 * Note: the backend no longer exposes the `id` UUID nor `short_id` for threads.
 * The public identifier of the thread is now `uid` (12 chars), and the retrieve
 * (/post/:id, /threads/<uid>/) is resolved by uid.
 */
/**
 * Resolves which reaction the current user has on the post, from `last_reaction`.
 * The backend exposes it as a reaction object (see legacy ReactionBox, which uses
 * last_reaction.id). We return the emoji so the UI (PostReactionPill.active,
 * picker highlight) compares it against each reaction. Defensive against shape
 * variations: direct emoji, string, or resolution by id against the array.
 */
function resolveCurrentUserReaction(backendPost) {
  const lr = backendPost.last_reaction;
  if (!lr) return null;
  if (typeof lr === "string") return lr;
  if (lr.emoji) return lr.emoji;
  const match = (backendPost.reactions || []).find((r) => r.id === lr.id);
  return match?.emoji || null;
}

/**
 * Maps the backend media to the shape ThreadMedia consumes:
 *   { id, type, url, isNsfw }
 * The backend sends { id, uid, is_video, is_nsfw, file (public URL) } — it does
 * NOT send dimensions (width/height live in the internal metadata), so the
 * aspect-ratio is derived on load. RECOMMENDATION: expose width/height in the
 * public media serializer to fully avoid layout shift on single images.
 */
export function mapMedia(media) {
  if (!Array.isArray(media) || media.length === 0) return null;
  return media.map((m, i) => ({
    id: m.uid || m.id || `media-${i}`,
    type: m.is_video || m.type === "video" ? "video" : "image",
    url: m.file || m.url || null,
    isNsfw: m.is_nsfw ?? false,
    // Dominant color for the fullscreen viewer background (null → warm fallback).
    dominantColor: m.target_color || m.dominantColor || null,
  }));
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
      // userReacted marks the current user's active reaction (Facebook model:
      // at most one). Persists the pill highlight after a reload.
      userReacted: currentUserReaction != null && r.emoji === currentUserReaction,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    currentUserReaction,
    uid: backendPost.uid,
    // The backend no longer returns the `id` UUID; the public identifier is `uid`.
    id: backendPost.uid,
    shortId: backendPost.uid,
    mask: {
      id: maskDisplayId,
      fullHash: backendPost.mask?.hash,
      countryCode: backendPost.mask?.country_code,
    },
    text: backendPost.text || "",
    time: backendPost.create_at || "",
    // Absolute publish timestamp (ISO) for the thread-details panel. `time`
    // above is the compact relative string the card renders.
    publishedAt: backendPost.created_at_iso || null,
    // Momentum from the For You engine. momentum_final = base × regional boost,
    // computed PER QUERY in the backend (only comes in the For
    // You feed); fallback to the persisted base. Only shown with DEBUG active.
    momentum: backendPost.momentum_final ?? backendPost.momentum_score ?? null,
    isTrending: false,
    repliesCount: backendPost.responses_count ?? 0,
    viewsCount: 0,
    reactions,
    // is_mine: this thread belongs to the current (anonymous) viewer — drives
    // the private "Your thread" tag in feed/search. is_op: this reply's author
    // is the thread's OP — drives the "OP" tag in the thread view. Both arrive
    // as plain booleans (no author identity); default false (never assume).
    isMine: backendPost.is_mine ?? false,
    isOp: backendPost.is_op ?? false,
    // Thread media (feed + head + replies) — real URLs + sensitive flag.
    media: mapMedia(backendPost.media),
  };
}
