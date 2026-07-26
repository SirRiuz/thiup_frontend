/**
 * Backend calls for the thread of /post/:id/.
 *
 * Reuses apiFetch (E2E encryption + client-assertion header) — does NOT
 * reimplement the transport or the encryption. Same contract as the legacy
 * thread (src/services/thread.js), but going through apiFetch instead of axios:
 *
 *   GET  /threads/<uid>/responses/  →  { head, parents, results, next, count }
 *   POST /threads/                  →  { sub, text, content, media }
 *
 * The backend returns the main post (`head`) and the first page of
 * responses (`results`) in a single call. Sub-responses come
 * nested inside each reply under `responses`. The uid can be a REPLY at any
 * depth (comment permalink): `head` is then that reply and `parents` carries
 * its ancestor chain (root first) for the Threads-style continuity UI.
 */
import { apiFetch } from "./client";

const THREADS_ENDPOINT = "/threads/";

/**
 * Fetches the main post + the first page of responses.
 *
 * @param {string} threadId   public uid of the thread (from useParams).
 * @param {object} [options]  { signal } for AbortController.
 * @returns {Promise<{head: object, parents: object[], results: object[], next: string|null, count: number}>}
 */
export function getThreadById(threadId, options = {}) {
  // Cache busting: timestamp in the URL so the browser never serves a
  // cached response. DRF ignores undeclared query params, so the
  // backend doesn't notice it. (Same pattern as FeedContext.)
  // `ordering` (optional) sorts the replies: -create_at / create_at /
  // -reactions_count. The backend applies it only to the thread's responses.
  const orderingParam = options.ordering
    ? `&ordering=${options.ordering}`
    : "";
  const url = `${THREADS_ENDPOINT}${threadId}/responses/?_t=${Date.now()}${orderingParam}`;
  return apiFetch(url, { signal: options.signal });
}

/**
 * Fetches an additional page of responses following DRF's `next`.
 *
 * @param {string} nextUrl    Absolute URL returned in the previous response.
 * @param {object} [options]  { signal }.
 * @returns {Promise<{results: object[], next: string|null, count: number}>}
 */
export function getThreadReplies(nextUrl, options = {}) {
  // DRF's `next` already carries its own pagination query params; it is used
  // as-is, just like loadMore in FeedContext.
  return apiFetch(nextUrl, { signal: options.signal });
}

/**
 * Fetches the threads created by the AUTHENTICATED user (their current mask).
 *
 * GET /threads/mine/ — the scope is 100% server-side (request.mask): the
 * frontend doesn't send any identifier. Most recent first, DRF
 * paginated (the following pages are followed with the `next` URL, e.g. via
 * fetchSearchNext).
 *
 * @param {object} [options]  { signal } for AbortController.
 * @returns {Promise<{results: object[], next: string|null, count: number}>}
 */
export function fetchMyThreads(options = {}) {
  // Cache busting like the feed: the user's own threads change when posting.
  const url = `${THREADS_ENDPOINT}mine/?_t=${Date.now()}`;
  return apiFetch(url, { signal: options.signal });
}

/**
 * Creates a reply. `parentId` is the target of the `sub` field:
 *   - comment directly to the thread → parentId === threadId (thread uid)
 *   - sub-comment to a reply         → parentId === id of that reply
 *
 * @param {{ parentId: string, text: string, content: object, media?: any[] }} params
 * @returns {Promise<object>}  The created reply (backend shape).
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
