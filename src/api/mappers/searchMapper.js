/**
 * Mappers of the search results (tags, users and media) from the backend to
 * the shape that SearchTagCard / SearchUserCard / the media grid expect.
 *
 * Posts are NOT mapped here: they reuse mapBackendPostToFrontend (same shape
 * as the feed). Backend: apps/search/serializers/search_serializers.py.
 */

import { mapMedia, mapBackendPostToFrontend } from "./postMapper";

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

/**
 * Media gallery item (search Media tab, IG-explore style): ONE tile per
 * matching thread — its FIRST file. The backend item IS the thread-card
 * media shape (uid, file, is_video, is_nsfw, width, height, target_color) —
 * mapMedia understands it verbatim — plus `media_count` (the thread's total
 * active files, for the tile's carousel mark) and `thread`, the parent's
 * full card. The thread reuses the feed mapper so the preview panel and the
 * "View thread" navigation can seed /p/:uid exactly like a feed card click.
 */
export function mapBackendMediaToFrontend(backendItem) {
  const [media] = mapMedia([backendItem]) || [];
  return {
    ...media,
    // Total active files of the parent thread (the tile shows only the
    // first): > 1 → the grid renders IG's carousel mark on the tile.
    mediaCount: backendItem.media_count ?? 1,
    thread: backendItem.thread
      ? mapBackendPostToFrontend(backendItem.thread)
      : null,
  };
}
