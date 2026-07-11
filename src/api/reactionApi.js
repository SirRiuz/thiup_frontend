/**
 * Backend calls for reactions, via apiFetch (E2E encryption intact).
 *
 * Replicates the legacy contract (src/services/reaction.js):
 *
 *   GET  /reactions/            → catalog of reaction types [{ id, name, emoji }]
 *   POST /reactions/ { reaction, thread }
 *
 * The POST is a single idempotent endpoint: the backend decides add / switch /
 * remove based on the user's current state (Facebook model, 1 reaction per post).
 * The frontend ALWAYS sends the id of the clicked reaction — just like the
 * legacy code (ReactionBox.onReact calls createReactionService with the same id both
 * when reacting and when removing). There is no DELETE or PUT.
 */
import { apiFetch } from "./client";

const REACTIONS_ENDPOINT = "/reactions/";

/**
 * Fetches the catalog of available reaction types. Used to resolve
 * the backend id of an emoji that is not yet present on the post.
 *
 * @param {object} [options]  { signal } for AbortController.
 * @returns {Promise<Array<{ id: any, name: string, emoji: string }>>}
 */
export async function getReactions(options = {}) {
  const data = await apiFetch(`${REACTIONS_ENDPOINT}?_t=${Date.now()}`, {
    signal: options.signal,
  });
  // The endpoint may come as a flat array or as a DRF page { results }.
  return Array.isArray(data) ? data : data?.results || [];
}

/**
 * Applies (or toggles) a reaction on a post. The backend resolves whether it is
 * create, change, or remove based on the user's current reaction.
 *
 * @param {{ reactionId: any, postId: string }} params
 *   reactionId = backend id of the reaction type.
 *   postId     = id of the post/thread (`thread` field in the legacy payload).
 * @returns {Promise<object>}  The backend's response.
 */
export function createReaction({ reactionId, postId }) {
  return apiFetch(REACTIONS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      reaction: reactionId,
      thread: postId,
    }),
  });
}
