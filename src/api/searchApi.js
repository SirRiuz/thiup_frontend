/**
 * Calls to the search endpoint. Reuses apiFetch (E2E encryption +
 * client-assertion + base URL). All searches carry cache busting
 * (&_t=Date.now()) like the feed, so the browser never serves cache;
 * DRF ignores undeclared query params, so the backend doesn't notice it.
 *
 * Backend: GET /search/?q=<query>&type=posts|tags|users|media[&ordering=...]
 *   → { counts: { posts, tags, users, media }, count, next, previous, results }
 * type=media items are the thread-card media shape plus `thread` (the parent's
 * full card) so the gallery preview seeds without a second request.
 */

import { apiFetch } from "./client";

const SEARCH_ENDPOINT = "/search/";

/**
 * First page of a search.
 * @param {object} opts
 * @param {string} opts.query     search text
 * @param {string} opts.type      posts | tags | users | media
 * @param {string} [opts.ordering] DRF ordering for post results
 *   (-reactions_count = top/trending, -create_at = latest/chronological).
 *   Only meaningful for type=posts; omitted otherwise.
 * @param {AbortSignal} [opts.signal]
 */
export function fetchSearch({ query, type = "posts", ordering, signal }) {
  const params = new URLSearchParams({
    q: query,
    type,
    _t: Date.now(),
  });
  // Additive: lets the 'top' vs 'latest' tabs ask for different orders without
  // touching the existing q/type params. The backend search view must declare
  // an ordering filter for it to take effect (otherwise DRF ignores it).
  if (ordering) params.set("ordering", ordering);
  return apiFetch(`${SEARCH_ENDPOINT}?${params.toString()}`, { signal });
}

/**
 * Next pagination page. `nextUrl` is the absolute URL that DRF returns
 * in `next` (already includes q, type, page and _t); apiFetch accepts
 * absolute URLs directly.
 */
export function fetchSearchNext(nextUrl, { signal } = {}) {
  return apiFetch(nextUrl, { signal });
}

const SUGGEST_ENDPOINT = "/search/suggest/";

/**
 * Autocomplete suggestions. Empty query → { trending: [...] } (precomputed
 * trending tags). Typing → { tags: [...], threads: [{uid, snippet}...] }
 * (indexed prefix tags by trend + thread content by momentum). Cheap on the
 * backend; the client debounces/cancels/caches.
 */
export function fetchSuggestions(query, { signal } = {}) {
  const params = new URLSearchParams({ q: query || "", _t: Date.now() });
  return apiFetch(`${SUGGEST_ENDPOINT}?${params.toString()}`, { signal });
}
