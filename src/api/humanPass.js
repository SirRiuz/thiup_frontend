/**
 * Human-pass manager (CAPTCHA_PROTECT) — structural mirror of ticket.js.
 *
 * Flow: the invisible solver (services/captcha.js) produces a single-use Cap
 * token → it is exchanged at POST /captcha/verify/ → the backend returns a
 * short JWT ("human pass", bound to the mask) that WRITES carry in the
 * `x-human-pass` header. Cached in memory and renewed before it expires; when
 * the server expires it (403 CAPTCHA_FAILED) apiFetch invalidates and retries.
 *
 * No recursion: uses dispatchRequest (low level), not apiFetch — same as
 * ticket.js and transport.js.
 */

import { isCaptchaEnabled } from "./config";
import { parseResponseBody } from "./decode";
import { dispatchRequest } from "./dispatch";
import { getClientAssertion } from "./ticket";
import { shouldUseGateway } from "./transportMode";
import { solveCaptcha } from "../services/captcha";

// Renew a little before the real expires_in so we don't spend an attempt on a
// pass that dies in flight.
const REFRESH_BEFORE_MS = 30 * 1000;
const FALLBACK_TTL_MS = 600 * 1000;

let cachedPass = null;
let expiresAt = 0;
let inFlight = null;

async function fetchPass() {
  const token = await solveCaptcha();

  // The endpoint requires the client-assertion (SINGLE_REQUEST_PROTECT); with
  // no ticket the request goes out without it and the backend rejects it —
  // same as apiFetch.
  let assertion = "";
  try {
    assertion = await getClientAssertion();
  } catch (err) {
    /* no ticket */
  }

  const res = await dispatchRequest({
    method: "POST",
    path: "/captcha/verify/",
    body: JSON.stringify({ token }),
    assertion,
    gateway: shouldUseGateway(),
  });
  // E_HP1 = the captcha exchange responded non-OK (status attached);
  // E_HP2 = OK response but no pass in the body. Opaque codes.
  if (!res.ok) throw new Error(`E_HP1:${res.status}`);
  const data = await parseResponseBody(res);
  if (!data || !data.pass) throw new Error("E_HP2");

  cachedPass = data.pass;
  const ttlMs = Number(data.expires_in) > 0
    ? Number(data.expires_in) * 1000
    : FALLBACK_TTL_MS;
  expiresAt = Date.now() + ttlMs;
  return cachedPass;
}

/**
 * Returns a valid human pass (cached or freshly exchanged), or null when the
 * captcha is off per /config/. Dedup: concurrent callers share the SAME
 * promise (a single PoW even if several writes fire at once).
 */
export async function getHumanPass() {
  if (!isCaptchaEnabled()) return null;
  const fresh = cachedPass && Date.now() < expiresAt - REFRESH_BEFORE_MS;
  if (fresh) return cachedPass;
  if (!inFlight) {
    inFlight = fetchPass().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Invalidates the cached pass (e.g. after a 403 CAPTCHA_FAILED). */
export function invalidateHumanPass() {
  cachedPass = null;
  expiresAt = 0;
}

/**
 * Pre-warms the pass in the background (fire-and-forget): fired when a
 * composer/modal opens so the later write goes out without waiting for the
 * PoW. Harmless if the captcha is off or the pass is already fresh.
 */
export function warmHumanPass() {
  getHumanPass().catch(() => {});
}
