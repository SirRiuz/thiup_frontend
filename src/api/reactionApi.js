/**
 * Llamadas al backend para reacciones, vía apiFetch (cifrado E2E intacto).
 *
 * Replica el contrato del legacy (src/services/reaction.js):
 *
 *   GET  /reactions/            → catálogo de tipos de reacción [{ id, name, emoji }]
 *   POST /reactions/ { reaction, thread }
 *
 * El POST es un único endpoint idempotente: el backend decide add / switch /
 * remove según el estado actual del user (modelo Facebook, 1 reacción por post).
 * El frontend SIEMPRE manda el id de la reacción clickeada — igual que el
 * legacy (ReactionBox.onReact llama createReactionService con el mismo id tanto
 * al reaccionar como al quitar). No hay DELETE ni PUT.
 */
import { apiFetch } from "./client";

const REACTIONS_ENDPOINT = "/reactions/";

/**
 * Trae el catálogo de tipos de reacción disponibles. Se usa para resolver
 * el id de backend de un emoji que todavía no está presente en el post.
 *
 * @param {object} [options]  { signal } para AbortController.
 * @returns {Promise<Array<{ id: any, name: string, emoji: string }>>}
 */
export async function getReactions(options = {}) {
  const data = await apiFetch(`${REACTIONS_ENDPOINT}?_t=${Date.now()}`, {
    signal: options.signal,
  });
  // El endpoint puede venir como array plano o como página DRF { results }.
  return Array.isArray(data) ? data : data?.results || [];
}

/**
 * Aplica (o togglea) una reacción sobre un post. El backend resuelve si es
 * crear, cambiar o quitar según la reacción actual del user.
 *
 * @param {{ reactionId: any, postId: string }} params
 *   reactionId = id de backend del tipo de reacción.
 *   postId     = id del post/thread (campo `thread` en el payload legacy).
 * @returns {Promise<object>}  La respuesta del backend.
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
