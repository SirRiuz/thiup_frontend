/**
 * Compact numbers with native Intl.NumberFormat (no libraries).
 *
 * Examples:
 *   0        → "0"        27      → "27"      999  → "999"
 *   1000     → "1k"       1500    → "1.5k"
 *   11509    → "11.5k"    11559   → "11.6k"   (Intl ROUNDS to 1 decimal)
 *   999999   → "1M"       1300000 → "1.3M"
 *   null/NaN → "0"
 *
 * Project preference: lowercase 'k'; uppercase 'M' (more legible than
 * 'm', which gets confused with meters/minutes).
 */

const compactFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompactNumber(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return "0";
  // < 1000: as-is, without abbreviating.
  if (Math.abs(value) < 1000) return String(value);
  return compactFormatter.format(value).replace("K", "k");
}
