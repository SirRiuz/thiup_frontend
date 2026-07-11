/**
 * ROBUST acquisition of a COARSE position — designed for Close You
 * (geohash precision 5, ~5km, fuzzed): we don't need fine GPS, so
 * low precision + a cached position is more reliable, faster and MORE
 * private.
 *
 * Why it exists: on Mac/Safari/WebKit, CoreLocation sometimes reports
 * kCLErrorLocationUnknown — a TRANSIENT failure ("couldn't determine the
 * location at this instant") that the Geolocation API maps to
 * POSITION_UNAVAILABLE (code 2). Treating it as fatal on the first attempt
 * broke Close You with the permission GRANTED. Strategy:
 *
 *   1. getCurrentPosition with enableHighAccuracy:false +
 *      a generous maximumAge (accepts a cached fix ~5 min — avoids forcing
 *      a new fix, which is exactly what fails) + a reasonable timeout.
 *   2. RETRIES with backoff on code 2/3 (transient ones). code 1
 *      (PERMISSION_DENIED) is NEVER retried — it propagates instantly.
 *   3. Final fallback with watchPosition: sometimes the watch gets a fix
 *      where getCurrentPosition fails. First valid fix → resolve and
 *      clearWatch; a global timeout so we don't stay listening; the watch is
 *      ALWAYS cleaned up (no leaks).
 *
 * The returned position is used and DISCARDED by the caller (ephemeral) —
 * this util persists nothing.
 */

const GEO_OPTIONS = {
  enableHighAccuracy: false, // coarse is enough; fine mode causes MORE kCLErrorLocationUnknown
  maximumAge: 300000, // accept a cached fix of up to 5 min
  timeout: 9000,
};

// Backoff between getCurrentPosition retries (total: 3 attempts).
const RETRY_DELAYS_MS = [900, 1500];

// Cap of the watchPosition fallback.
const WATCH_FALLBACK_TIMEOUT_MS = 10000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getPositionOnce(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/** Fallback: first valid fix from the watch, with a global timeout and cleanup. */
function getPositionViaWatch(options, timeoutMs) {
  return new Promise((resolve, reject) => {
    let watchId = null;
    let timer = null;
    let settled = false;
    let lastError = null;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer !== null) clearTimeout(timer);
    };
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };

    timer = setTimeout(() => {
      // No fix within the cap: report the last error seen (or a
      // synthetic TIMEOUT with the same {code, message} shape).
      settle(
        reject,
        lastError || { code: 3, message: "watchPosition fallback timed out" }
      );
    }, timeoutMs);

    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => settle(resolve, position),
        (error) => {
          // Real block → finish now; transient ones → keep listening
          // until the global timeout (the watch may recover).
          if (error && error.code === 1) {
            settle(reject, error);
            return;
          }
          lastError = error;
        },
        options
      );
    } catch (err) {
      settle(reject, err);
    }
  });
}

/**
 * Coarse position with retries + fallback. Resolves with a
 * GeolocationPosition; rejects with the geolocation error (code 1 =
 * denied — the caller shows its blocked state; others = the full
 * strategy was exhausted).
 */
export async function getCoarsePosition() {
  let lastError = null;

  // Initial attempt + retries with backoff on transient errors (2/3).
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1]);
    try {
      return await getPositionOnce(GEO_OPTIONS);
    } catch (error) {
      if (error && error.code === 1) throw error; // denied: never retry
      lastError = error;
    }
  }

  // Persistent failures → last resort: watchPosition.
  try {
    return await getPositionViaWatch(GEO_OPTIONS, WATCH_FALLBACK_TIMEOUT_MS);
  } catch (error) {
    throw error || lastError;
  }
}
