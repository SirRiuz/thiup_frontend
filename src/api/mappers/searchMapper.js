/**
 * Mappers de los resultados de búsqueda (tags y users) del backend al shape
 * que esperan SearchTagCard / SearchUserCard.
 *
 * Los posts NO se mapean aquí: reusan mapBackendPostToFrontend (mismo shape
 * que el feed). Backend: apps/search/serializers/search_serializers.py.
 */

/**
 * Tag agregado: { name, count, activity } → { name, postsCount, activity }.
 * `count` es el número real de posts del tag (annotate en el backend).
 * `activity` es la serie temporal REAL (posts por día, últimos N días, con
 * días sin posts en 0) que dibuja el sparkline; si no viene, null para que
 * TagSparkline caiga al mock determinístico por seed.
 */
export function mapBackendTagToFrontend(backendTag) {
  return {
    name: backendTag.name,
    postsCount: backendTag.count ?? 0,
    activity: Array.isArray(backendTag.activity) ? backendTag.activity : null,
  };
}

/**
 * Mask/usuario: { hash, country_code, posts_count, joined_at, miniature }
 * → { maskId, fullHash, countryCode, postsCount, joinedAt }.
 * maskId = primeros 6 chars del hash (mismo criterio que el mapper de posts).
 */
export function mapBackendUserToFrontend(backendUser) {
  const hash = backendUser.hash || "";
  return {
    maskId: hash.slice(0, 6),
    fullHash: hash,
    countryCode: backendUser.country_code,
    postsCount: backendUser.posts_count ?? 0,
    joinedAt: backendUser.joined_at || "",
  };
}
