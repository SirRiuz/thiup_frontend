/**
 * Fetch wrapper that adds the base URL, transport (gateway/direct),
 * encryption and typed errors.
 *
 * The backend runs in two modes depending on ENCRYPTED_RESPONSE:
 *
 *  - Encrypted mode: EVERY request (ticket and config included) is routed
 *    through the rotating-path GATEWAY /{hash}/ — the real destination
 *    (method, path, query, body) travels inside the encrypted envelope and
 *    the backend dispatches internally. The response arrives encrypted
 *    (X-Response-Payload) and is decrypted with the existing `decrypt`.
 *    Uniformity: everything looks the same.
 *
 *  - Plain mode: direct, readable calls to the real endpoints.
 *
 * The mode is resolved ONCE at bootstrap (transport.js, fail-closed to
 * gateway). apiFetch does NOT know the crypto: it orchestrates retry + errors
 * and delegates egress to dispatchRequest (single point). SINGLE_REQUEST_
 * PROTECT: the `client-assertion` is always sent (harmless if the flag is off).
 */

import { parseResponseBody } from "./decode";
import { dispatchRequest, DispatchEncryptError } from "./dispatch";
import { getHumanPass, invalidateHumanPass } from "./humanPass";
import { blockAsBot } from "../utils/humanBlock";
import { getClientAssertion, refreshTicket } from "./ticket";
import { ensureTransportMode } from "./transport";
import { shouldUseGateway } from "./transportMode";
import {
  SERVER_ERROR_EVENT,
  NETWORK_ERROR_EVENT,
} from "../contexts/ServerHealthContext";
import { BASE_URL } from "../settings";

const API_BASE_URL = BASE_URL;

// Refresh-and-retry: at most 3 ATTEMPTS per request (original + 2 retries).
// Only a 403 triggers refresh+retry — expired ticket or, on writes, an
// expired human pass (code CAPTCHA_FAILED); other errors propagate as-is.
// LOCAL counter per request (never shared).
const MAX_ATTEMPTS = 3;

// Writes that require the human pass (CAPTCHA_PROTECT): an EXACT mirror of
// the actions decorated with @human_validator in the backend. Read-only
// POSTs (/threads/foryou/, /threads/closeyou/) are NOT here.
const HUMAN_PASS_PATHS = new Set([
  "/threads/",
  "/reactions/",
  "/reports/",
  "/thread-files/presign/",
  "/thread-files/confirm/",
]);

const needsHumanPass = (method, path) =>
  method === "POST" && HUMAN_PASS_PATHS.has(path);

export class APIError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Performs a request to the backend.
 *
 * @param {string} url      Relative path ('/threads/') or absolute URL
 *                          (useful for passing `response.next` directly in pagination).
 * @param {object} options  Fetch options, includes `signal` for AbortController.
 * @returns {Promise<any>}  Decrypted JSON.
 * @throws  {APIError}      If the response is not OK (decrypted payload in .payload).
 */
export async function apiFetch(url, options = {}) {
  // The mode (gateway vs direct) must be resolved BEFORE sending.
  // ensureTransportMode fetches ticket+config on its own low-level channel
  // (not via apiFetch) → no recursion. Fail-closed: when in doubt, gateway.
  await ensureTransportMode();

  // Real destination: split path+query (works for relative paths and for the
  // absolute `next` URLs in pagination). The body is normalized to a string.
  const dest = new URL(
    url.startsWith("http") ? url : `${API_BASE_URL}${url}`,
    API_BASE_URL
  );
  const path = dest.pathname;
  const query = dest.search.startsWith("?") ? dest.search.slice(1) : dest.search;
  const method = (options.method || "GET").toUpperCase();
  const body =
    options.body == null
      ? null
      : typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body);

  for (let attempt = 1; ; attempt += 1) {
    // Client-assertion ISSUED BY THE SERVER (the FE has no secret). On a
    // retry (attempt > 1) we force a fresh ticket.
    let assertion = "";
    try {
      assertion =
        attempt === 1 ? await getClientAssertion() : await refreshTicket();
    } catch (err) {
      /* no ticket: the request goes out without an assertion and the backend rejects it */
    }

    // Human pass (protected writes only): travels as a REAL header on the
    // outer request, just like client-assertion. If it couldn't be obtained
    // (Cap down, solver failed), the request goes out WITHOUT a pass and the
    // backend answers its typed 403/503 — the visible error is the server's.
    let extraHeaders = options.headers;
    if (needsHumanPass(method, path)) {
      try {
        const pass = await getHumanPass();
        if (pass) {
          extraHeaders = { ...(options.headers || {}), "x-human-pass": pass };
        }
      } catch (err) {
        /* no pass: the backend decides */
      }
    }

    let response;
    try {
      // SINGLE egress point. Rebuilds the gateway envelope on EVERY attempt
      // → a fresh envelope on retry (no double-encryption, no consumed stream).
      response = await dispatchRequest({
        method,
        path,
        query,
        body,
        assertion,
        gateway: shouldUseGateway(),
        signal: options.signal,
        extraHeaders,
      });
    } catch (err) {
      // "Encrypted or nothing" policy: if the envelope couldn't be
      // encrypted/derived, the request did NOT go out; we fail locally with
      // the standard shape (never plain).
      if (err instanceof DispatchEncryptError) {
        // E_ENC1 = the local envelope couldn't be encrypted (request never
        // left). Opaque message; the shape (status 0 + detail) is kept
        // identical for the existing error handling.
        throw new APIError("E_ENC1", 0, {
          detail: "encryption_failed",
        });
      }
      // The request FAILED WITH NO HTTP response (network down / server
      // unreachable): a NETWORK error, not a server one → a distinct event so
      // the "no connection" screen shows. Consumer aborts don't count.
      if (!err || err.name !== "AbortError") {
        window.dispatchEvent(new Event(NETWORK_ERROR_EVENT));
      }
      throw err;
    }

    if (response.ok) {
      return parseResponseBody(response);
    }

    // 403: if attempts remain, the body CODE tells which credential expired
    // — CAPTCHA_FAILED → renew the human pass (solve another PoW); any other
    // 403 → refresh the ticket (the usual behavior). Other errors (400/404/
    // 5xx) are NOT retried.
    if (response.status === 403 && attempt < MAX_ATTEMPTS) {
      let body403 = null;
      try {
        body403 = await parseResponseBody(response);
      } catch (err) {
        /* unreadable body: treated as a ticket 403 */
      }
      try {
        if (body403 && body403.code === "CAPTCHA_FAILED") {
          invalidateHumanPass();
          await getHumanPass();
        } else {
          await refreshTicket();
        }
        continue; // retry with the fresh credential
      } catch (err) {
        /* renewal failed: propagate the original 403 below */
      }
      // Solving a fresh PoW still failed to yield a usable pass → we can't
      // prove this session is human. Wipe the app behind the wall.
      if (body403 && body403.code === "CAPTCHA_FAILED") blockAsBot();
      throw new APIError(
        `API error 403: ${response.statusText}`,
        403,
        body403
      );
    }

    // No retry (or exhausted): propagate with the SAME shape as today.
    const data = await parseResponseBody(response);
    // Retries exhausted and the backend STILL rejects the human pass: the
    // session could not be verified as human → anti-scraping wall.
    if (response.status === 403 && data?.code === "CAPTCHA_FAILED") blockAsBot();
    // The 503 CAPTCHA_UNAVAILABLE (Cap server down) is NOT a backend outage:
    // it propagates to the call site without firing the global notice.
    if (response.status >= 500 && data?.code !== "CAPTCHA_UNAVAILABLE") {
      window.dispatchEvent(new Event(SERVER_ERROR_EVENT));
    }
    throw new APIError(
      `API error ${response.status}: ${response.statusText}`,
      response.status,
      data
    );
  }
}
