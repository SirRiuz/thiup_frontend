/**
 * Llamadas al backend para el thread de /post/:id/.
 *
 * Reutiliza apiFetch (cifrado E2E + header client-assertion) — NO reimplementa
 * el transporte ni el cifrado. Mismo contrato que el thread legacy
 * (src/services/thread.js), pero pasando por apiFetch en lugar de axios:
 *
 *   GET  /threads/<uid>/responses/  →  { head, results, next, count }
 *   POST /threads/                  →  { sub, text, content, media }
 *
 * El backend devuelve el post principal (`head`) y la primera página de
 * respuestas (`results`) en una sola llamada. Las sub-respuestas vienen
 * anidadas dentro de cada reply en `responses`.
 */
import { apiFetch } from "./client";

const THREADS_ENDPOINT = "/threads/";

/**
 * Trae el post principal + la primera página de respuestas.
 *
 * @param {string} threadId   uid público del thread (de useParams).
 * @param {object} [options]  { signal } para AbortController.
 * @returns {Promise<{head: object, results: object[], next: string|null, count: number}>}
 */
export function getThreadById(threadId, options = {}) {
  // Cache busting: timestamp en la URL para que el browser nunca sirva una
  // respuesta cacheada. DRF ignora query params no declarados, así que el
  // backend no lo nota. (Mismo patrón que FeedContext.)
  // `ordering` (opcional) ordena los replies: -create_at / create_at /
  // -reactions_count. El backend lo aplica solo a las respuestas del thread.
  const orderingParam = options.ordering
    ? `&ordering=${options.ordering}`
    : "";
  const url = `${THREADS_ENDPOINT}${threadId}/responses/?_t=${Date.now()}${orderingParam}`;
  return apiFetch(url, { signal: options.signal });
}

/**
 * Trae una página adicional de respuestas siguiendo el `next` de DRF.
 *
 * @param {string} nextUrl    URL absoluta devuelta en la respuesta anterior.
 * @param {object} [options]  { signal }.
 * @returns {Promise<{results: object[], next: string|null, count: number}>}
 */
export function getThreadReplies(nextUrl, options = {}) {
  // El `next` de DRF ya trae sus propios query params de paginación; se usa
  // tal cual, igual que loadMore en FeedContext.
  return apiFetch(nextUrl, { signal: options.signal });
}

/**
 * Crea una respuesta. `parentId` es el destino del campo `sub`:
 *   - comment directo al thread → parentId === threadId (uid del thread)
 *   - sub-comment a un reply     → parentId === id de ese reply
 *
 * @param {{ parentId: string, text: string, content: object, media?: any[] }} params
 * @returns {Promise<object>}  La respuesta creada (shape del backend).
 */
export function createReply({ parentId, text, content, media = [] }) {
  return apiFetch(THREADS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      sub: parentId,
      text,
      content,
      media,
    }),
  });
}
