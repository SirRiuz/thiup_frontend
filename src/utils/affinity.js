/**
 * Tag affinity profile — 100% client-side.
 *
 * PRIVACY (inviolable principle): this { tag: weight } map lives ONLY in
 * the device's localStorage. It is NEVER sent in full to the server nor
 * persisted in the backend. The only thing that leaves the device is the top
 * N tags as an EPHEMERAL query parameter for the For You — indistinguishable
 * from a tag search. If the server is compromised, there is no profile to
 * leak.
 *
 * Same defensive pattern as recentSearches.js: localStorage can be
 * disabled or full — the app never breaks because of that.
 */

import { HASHTAG_RE } from "./hashtags";

const STORAGE_KEY = "thiup:affinity";

// ── Weights per interaction (tunable) ─────────────────────────────────
// Commenting is the strongest signal (effort), reacting medium, reading
// (dwell) the weakest. Open-and-leave adds nothing.
export const AFFINITY_WEIGHTS = {
  comment: 3,
  reaction: 2,
  dwell: 1,
};

// Dwell: VISIBLE time on the thread to count as "read" (~25s).
export const DWELL_THRESHOLD_MS = 25000;

// How many top tags are sent to the For You (only the names, never weights).
// With POST there is no URL limit: the cap is by query COST on the
// backend (filtering/counting against many tags is heavy on the Raspberry).
export const TOP_TAGS_COUNT = 10;

// Light decay: when recording an interaction, the existing weights are
// multiplied by DECAY — recent interests weigh more than old
// ones without needing timestamps.
const DECAY = 0.99;

// Map cap: we keep the MAX_TAGS with the highest weight so the
// profile doesn't grow without bound in localStorage.
const MAX_TAGS = 50;

/** Reads the { tag: weight } map from localStorage. Never throws. */
export function getAffinityMap() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (err) {
    return {};
  }
}

function persist(map) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    /* storage full/disabled: the affinity simply doesn't persist */
  }
}

/**
 * Extracts the tags from a thread's text, normalized (no '#', lowercase,
 * no duplicates). Same regex as the rest of the frontend and as the backend
 * (Tags are stored lowercase). Threads without tags → [].
 */
export function extractTags(text) {
  const matches = (text || "").match(HASHTAG_RE) || [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

/**
 * Tags of the content being interacted with (thread OR reply of any
 * level): its OWN tags from its text; if it has none, falls back to
 * `fallbackTags` (the root thread's — reacting to a reply without tags is
 * still a signal about the thread's topic). Single shared rule: don't
 * duplicate logic between thread and replies.
 */
export function tagsForContent(text, fallbackTags = []) {
  const own = extractTags(text);
  return own.length ? own : fallbackTags;
}

/**
 * Records an interaction: adds `weight` to EACH tag of the content
 * (creating the entry if it doesn't exist). Robust: accepts an array or a
 * loose string, ignores empties and duplicates. No tags → no-op.
 */
export function addInteraction(tags, weight) {
  if (typeof tags === "string") tags = [tags];
  if (!Array.isArray(tags) || tags.length === 0 || !weight) return;

  const map = getAffinityMap();

  // Decay: the old loses relevance against the new.
  for (const key of Object.keys(map)) {
    map[key] = map[key] * DECAY;
  }

  for (const tag of tags) {
    const clean = String(tag).trim().toLowerCase();
    if (!clean) continue;
    map[clean] = (map[clean] || 0) + weight;
  }

  // Cap: keep only the MAX_TAGS heaviest ones.
  const entries = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TAGS);

  persist(Object.fromEntries(entries));
}

/**
 * Top n tags by weight — ONLY the names, the weights never leave here.
 * Empty map (new user) → [] → the For You serves the global top
 * (PHASE 1 cold start, unchanged).
 */
export function getTopTags(n = TOP_TAGS_COUNT) {
  return Object.entries(getAffinityMap())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag]) => tag);
}

/** Clears the profile (utility for debug / future privacy settings). */
export function clearAffinity() {
  persist({});
}
