/**
 * Datos de perfil de una máscara (hover card). Reusa apiFetch (cifrado E2E +
 * client-assertion) y cache busting &_t como el resto de llamadas.
 *
 * Backend: GET /users/<hash>/ →
 *   { mask_id, joined (ISO), posts_count, replies_count }
 */

import { apiFetch } from "./client";

const USERS_ENDPOINT = "/users/";

export function fetchMaskProfile(fullHash, { signal } = {}) {
  return apiFetch(
    `${USERS_ENDPOINT}${encodeURIComponent(fullHash)}/?_t=${Date.now()}`,
    { signal }
  );
}

/**
 * La máscara del usuario ACTUAL (GET /me/, privado + E2E). Se llama UNA sola
 * vez por sesión desde CurrentUserContext — el resultado queda cacheado
 * globalmente y se reutiliza en toda la app.
 */
export function fetchCurrentMask({ signal } = {}) {
  return apiFetch(`/me/?_t=${Date.now()}`, { signal });
}
