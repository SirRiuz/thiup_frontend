/**
 * Rate-limit helpers (HTTP 429).
 *
 * A throttled write is NOT a failure the user can fix by retrying right now —
 * it is a "wait a moment" state. The UI treats it apart from real errors (see
 * RateLimitNotice) and needs to know HOW LONG the wait is. That wait can
 * travel in three shapes, in order of trust:
 *
 *   1. `err.retryAfter` — the Retry-After response header (attached by apiFetch)
 *   2. a numeric field in the payload (`retry_after` / `retryAfter` / `wait`)
 *   3. DRF's throttle sentence ("Request was throttled. Expected available in
 *      27 seconds.") — the last resort, parsed for its number only
 *
 * When none is present the notice simply drops the countdown and shows the
 * generic "wait a few seconds" line — it never invents a duration.
 */

// Anything longer is a misconfigured window (or an HTTP-date we misread):
// counting down for an hour inside a composer is worse than saying nothing.
const MAX_WAIT_SECONDS = 600;

const SECONDS_RE = /(\d+)\s*(?:s\b|sec|second|segundo)/i;

/** True for a throttled request (HTTP 429). */
export function isRateLimitError(err) {
  return Boolean(err) && err.status === 429;
}

const normalize = (value) => {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.min(Math.ceil(seconds), MAX_WAIT_SECONDS);
};

/**
 * Seconds the user has to wait before retrying, or null when the backend
 * didn't say (the caller then shows the countdown-less copy).
 *
 * @param {Error & {status?: number, retryAfter?: number, payload?: object}} err
 * @returns {number|null}
 */
export function getRetryAfterSeconds(err) {
  if (!isRateLimitError(err)) return null;
  const payload = err.payload || {};
  const candidates = [
    err.retryAfter,
    payload.retry_after,
    payload.retryAfter,
    payload.wait,
  ];
  for (const candidate of candidates) {
    const seconds = normalize(candidate);
    if (seconds != null) return seconds;
  }
  const detail = typeof payload.detail === "string" ? payload.detail : "";
  const match = detail.match(SECONDS_RE);
  return match ? normalize(match[1]) : null;
}

// The wait belongs to the ERROR, not to whatever is rendering it: the notice
// unmounts and remounts (collapsing/expanding the reply composer) while the
// same 429 is still standing, and a per-mount countdown would restart the
// ring every time. Resolved ONCE per error object and memoized here, so every
// mount reads the same absolute deadline. WeakMap → nothing is retained once
// the error is dropped, and the error itself is never mutated.
const waits = new WeakMap();

/**
 * The wait for a throttled request as an ABSOLUTE deadline, stable across
 * remounts: { seconds, deadline } — `seconds` is the original window (the
 * ring's 100%) and `deadline` an epoch ms. Both null when the backend didn't
 * say how long; null for anything that isn't a 429.
 *
 * @param {Error & {status?: number}} err
 * @returns {{seconds: number|null, deadline: number|null}|null}
 */
export function getRateLimitWait(err) {
  if (!isRateLimitError(err)) return null;
  const cached = waits.get(err);
  if (cached) return cached;
  const seconds = getRetryAfterSeconds(err);
  const wait =
    seconds == null
      ? { seconds: null, deadline: null }
      : { seconds, deadline: Date.now() + seconds * 1000 };
  waits.set(err, wait);
  return wait;
}
