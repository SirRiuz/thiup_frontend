import { setServerConfig } from "./config";
import { parseResponseBody } from "./decode";
import { dispatchRequest } from "./dispatch";
import { invalidateTicket } from "./ticket";
import { getMode, setMode } from "./transportMode";

/**
 * TRANSPORT MODE detection by PROBING the gateway — governed 100% by the
 * backend (ENCRYPTED_RESPONSE), with nothing in the FE's .env.
 *
 * The probe tries /config/ THROUGH THE GATEWAY (POST /{token}/ with the
 * {GET /config/} envelope). No ticket (config is AllowAny). Inference:
 *   - 2xx that DECRYPTS cleanly            → ENCRYPTED mode (all via gateway).
 *   - 404 with code === "GATEWAY_DISABLED" → NORMAL mode (all direct/plain).
 *   - anything ELSE (generic 404, invalid encrypted token, network error,
 *     timeout, invalid decryption) → AMBIGUOUS: do NOT conclude normal. Stay
 *     FAIL-CLOSED (encrypted) and retry with bounded backoff.
 *
 * No loops: at most PROBE_MAX_ATTEMPTS; if inconclusive it stays ENCRYPTED
 * (the safe default). The mode is set in ONE single source of truth
 * (transportMode).
 */
const PROBE_MAX_ATTEMPTS = 3;
const PROBE_BACKOFF_MS = 150;

let inFlight = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probeMode() {
  // Probe THROUGH THE GATEWAY (gateway:true), no ticket (config is AllowAny).
  const res = await dispatchRequest({
    method: "GET",
    path: "/config/",
    gateway: true,
  });

  if (res.ok) {
    // Must decrypt cleanly to confirm encrypted mode (if it fails → ambiguous).
    // The body IS the server config: capture it in the singleton so the rest
    // of the code can read the flags (e.g. captcha) without another request.
    const config = await parseResponseBody(res);
    setServerConfig(config);
    return "encrypted";
  }

  if (res.status === 404) {
    // UNAMBIGUOUS signal only if the body carries the specific code. In
    // encrypted mode a 404 (e.g. invalid token) comes encrypted → res.json()
    // fails → ambiguous (not confused with gateway_disabled).
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      /* non-JSON / encrypted body → ambiguous */
    }
    if (body && body.code === "GATEWAY_DISABLED") {
      // Plain mode: the config did not arrive via the gateway — fetch it
      // directly to capture the flags anyway. Best-effort: if it fails, the
      // singleton stays null and the captcha behaves as off on the FE.
      try {
        const direct = await dispatchRequest({
          method: "GET",
          path: "/config/",
          gateway: false,
        });
        if (direct.ok) setServerConfig(await parseResponseBody(direct));
      } catch (e) {
        /* no direct config: flags unavailable */
      }
      return "normal";
    }
  }

  // E_TR1 = ambiguous probe (neither encrypted nor plain confirmed). Opaque
  // code: don't name the transport architecture in the production bundle.
  throw new Error("E_TR1");
}

async function resolveMode() {
  for (let attempt = 1; attempt <= PROBE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const detected = await probeMode();
      setMode({ gateway: detected === "encrypted", resolved: true });
      return getMode();
    } catch (err) {
      // Ambiguous → fail-closed (NEVER conclude normal from an inconclusive
      // failure). Bounded backoff and retry.
      if (attempt < PROBE_MAX_ATTEMPTS) {
        await sleep(attempt * PROBE_BACKOFF_MS);
      }
    }
  }

  // No conclusion after the retries → stay ENCRYPTED (safe).
  invalidateTicket();
  setMode({ gateway: true, resolved: true });
  return getMode();
}

/**
 * Resolves the mode ONCE (cached). apiFetch awaits it before sending.
 * Single-flight: concurrent requests share the same resolution.
 */
export async function ensureTransportMode() {
  if (getMode().resolved) return getMode();
  if (!inFlight) {
    inFlight = resolveMode().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
