/**
 * Deterministic mock data of activity per tag.
 *
 * The same tagName ALWAYS generates the same series (the name is the seed),
 * so the sparkline doesn't change between renders or refreshes. When the
 * backend exposes the real series, it's enough to replace this function with
 * the real data source: the TagSparkline component needs no changes.
 */

// Stable hash of a string → positive integer (the RNG seed).
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0; // force 32-bit int
  }
  return Math.abs(h);
}

// Seeded linear congruential PRNG → deterministic sequence in [0, 1).
function seededRandom(seed) {
  let s = seed % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Generates a time series of `points` values with visible peaks and valleys.
 * @param {string} tagName - seed (same tag → same line)
 * @param {number} points  - number of points in the series
 * @returns {number[]}
 */
export default function generateTagActivity(tagName, points = 12) {
  const rng = seededRandom(hashString(tagName || "tag"));
  const data = [];
  let val = 5 + rng() * 12;
  for (let i = 0; i < points; i++) {
    val += (rng() - 0.45) * 9; // variation with a slight upward bias
    val = Math.max(1, Math.min(30, val)); // clamp to the range [1, 30]
    data.push(val);
  }
  return data;
}
