/**
 * Profile data of a mask (hover card). Reuses apiFetch (E2E encryption +
 * client-assertion) and cache busting &_t like the rest of the calls.
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
 * The CURRENT user's mask (GET /me/, private + E2E). Called only ONCE
 * per session from CurrentUserContext — the result is cached
 * globally and reused throughout the app.
 */
export function fetchCurrentMask({ signal } = {}) {
  return apiFetch(`/me/?_t=${Date.now()}`, { signal });
}
