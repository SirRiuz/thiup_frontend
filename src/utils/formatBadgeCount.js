/**
 * IG/Twitter-style badge cap: 1-99 shows exact, 100+ shows "99+". Backend
 * always returns the raw count (see api/notificationApi.js) — this is
 * purely cosmetic, kept as its own tiny function so the cutoff is a
 * one-line change if product wants a different cap later.
 */
export function formatBadgeCount(count) {
  return count > 99 ? "99+" : String(count);
}
