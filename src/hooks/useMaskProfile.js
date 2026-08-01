import { useState, useEffect } from "react";
import { fetchMaskProfile } from "../api/userApi";

/**
 * Profile of a mask for the hover card, ON DEMAND and CACHED.
 *
 * - On demand: the hook lives inside the hover card, which only mounts on
 *   hover (with its delay) — it's never fetched when rendering the lists.
 * - Cache by hash (module-level, lives for the whole session): the same mask
 *   repeated in the feed, or a second hover, does NOT repeat the request or
 *   the skeleton.
 */
const profileCache = new Map();
// FIFO cap: entries are tiny (5 scalars), but the map was the one module
// cache with no eviction at all — a long session hovering many masks grew
// it without bound.
const MAX_PROFILES = 100;

function mapProfile(data) {
  return {
    joinedAt: data.joined,
    postsCount: data.posts_count ?? 0,
    repliesCount: data.replies_count ?? 0,
    // Reactions RECEIVED across the mask's posts (same aggregate as /me).
    reactionsCount: data.reactions_count ?? 0,
    // Ephemeral presence (60s TTL on the backend) — the green activity dot.
    isOnline: Boolean(data.is_online),
  };
}

export function useMaskProfile(fullHash) {
  const cached = fullHash ? profileCache.get(fullHash) : null;
  const [profile, setProfile] = useState(cached || null);
  const [isLoading, setIsLoading] = useState(Boolean(fullHash) && !cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fullHash) {
      setIsLoading(false);
      return undefined;
    }
    const hit = profileCache.get(fullHash);
    if (hit) {
      setProfile(hit);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setError(null);

    fetchMaskProfile(fullHash, { signal: controller.signal })
      .then((data) => {
        const mapped = mapProfile(data);
        profileCache.set(fullHash, mapped);
        if (profileCache.size > MAX_PROFILES) {
          profileCache.delete(profileCache.keys().next().value);
        }
        if (!active) return;
        setProfile(mapped);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active || (err && err.name === "AbortError")) return;
        setError(err);
        setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [fullHash]);

  return { profile, isLoading, error };
}
