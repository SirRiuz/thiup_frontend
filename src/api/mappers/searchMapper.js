/**
 * Mappers of the search results (tags and users) from the backend to the shape
 * that SearchTagCard / SearchUserCard expect.
 *
 * Posts are NOT mapped here: they reuse mapBackendPostToFrontend (same shape
 * as the feed). Backend: apps/search/serializers/search_serializers.py.
 */

/**
 * Aggregated tag: { name, count, activity } → { name, postsCount, activity }.
 * `count` is the real number of posts of the tag (annotate in the backend).
 * `activity` is the REAL time series (posts per day, last N days, with
 * days without posts at 0) that draws the sparkline; if it doesn't come, null so
 * TagSparkline falls back to the deterministic seed-based mock.
 */
export function mapBackendTagToFrontend(backendTag) {
  return {
    name: backendTag.name,
    postsCount: backendTag.count ?? 0,
    activity: Array.isArray(backendTag.activity) ? backendTag.activity : null,
  };
}

/**
 * Mask/user: { hash, country_code, posts_count, joined_at, is_online }
 * → { maskId, fullHash, countryCode, postsCount, joinedAt, isOnline }.
 * maskId = first 6 chars of the hash (same criterion as the posts mapper).
 */
export function mapBackendUserToFrontend(backendUser) {
  const hash = backendUser.hash || "";
  return {
    maskId: hash.slice(0, 6),
    fullHash: hash,
    countryCode: backendUser.country_code,
    postsCount: backendUser.posts_count ?? 0,
    joinedAt: backendUser.joined_at || "",
    // Ephemeral presence (active in the last 60s) — green dot on the card.
    isOnline: Boolean(backendUser.is_online),
  };
}
