/**
 * Llamadas al endpoint de búsqueda. Reusa apiFetch (cifrado E2E +
 * client-assertion + base URL). Todas las búsquedas llevan cache busting
 * (&_t=Date.now()) igual que el feed, para que el browser nunca sirva cache;
 * DRF ignora los query params no declarados, así que el backend no lo nota.
 *
 * Backend: GET /search/?q=<query>&type=posts|tags|users → devuelve
 *   { counts: { posts, tags, users }, count, next, previous, results }
 */

import { apiFetch } from "./client";

const SEARCH_ENDPOINT = "/search/";

/**
 * Primera página de una búsqueda.
 * @param {object} opts
 * @param {string} opts.query  texto de búsqueda
 * @param {string} opts.type   posts | tags | users
 * @param {AbortSignal} [opts.signal]
 */
export function fetchSearch({ query, type = "posts", signal }) {
  const params = new URLSearchParams({
    q: query,
    type,
    _t: Date.now(),
  });
  return apiFetch(`${SEARCH_ENDPOINT}?${params.toString()}`, { signal });
}

/**
 * Página siguiente de paginación. `nextUrl` es la URL absoluta que devuelve
 * DRF en `next` (ya incluye q, type, page y _t); apiFetch acepta URLs
 * absolutas directamente.
 */
export function fetchSearchNext(nextUrl, { signal } = {}) {
  return apiFetch(nextUrl, { signal });
}

const THREADS_ENDPOINT = "/threads/";
const SUGGEST_ENDPOINT = "/search/suggest/";

/**
 * Sugerencias de TAGS para el autocomplete (ligero: prefijo indexado sobre el
 * name del tag, nunca el texto de los hilos; máx 8, por popularidad).
 */
export function fetchTagSuggestions(query, { signal } = {}) {
  const params = new URLSearchParams({ q: query, _t: Date.now() });
  return apiFetch(`${SUGGEST_ENDPOINT}?${params.toString()}`, { signal });
}

/**
 * Posts de un tag EXACTO (modo tag de /search-new). Reusa el endpoint del
 * feed: /threads/?tag= filtra por la relación Thread-Tag (no icontains), con
 * el mismo serializer del feed → mismo mapper. El backend lowercasea el tag.
 *
 * @param {object} opts
 * @param {string} opts.tag       nombre del tag (sin '#')
 * @param {string} opts.ordering  ordering DRF (-create_at | create_at | -reactions_count)
 * @param {AbortSignal} [opts.signal]
 */
export function fetchPostsByTag({ tag, ordering = "-create_at", signal }) {
  const params = new URLSearchParams({
    tag,
    ordering,
    _t: Date.now(),
  });
  return apiFetch(`${THREADS_ENDPOINT}?${params.toString()}`, { signal });
}
