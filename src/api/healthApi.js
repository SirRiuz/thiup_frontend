/**
 * Backend healthcheck — through apiFetch, with the SAME standard rules as
 * any call in the app: E2E encryption + client-assertion (single
 * request) + cache busting. It is no longer a direct fetch to a public endpoint.
 *
 * The ONLY thing that matters is the status: if apiFetch RESOLVES, there was a 200
 * (server + DB + auth + encryption OK). Any failure (non-200, auth, network,
 * timeout) => down.
 */

import { apiFetch } from "./client";

// Generous on purpose: on a slow network (3G / weak signal) or a briefly
// saturated server, the full round-trip (TLS + encrypted envelope + response)
// can easily exceed 5s — aborting that early misread "slow" as "down" and
// showed the server-error screen (false positive). 15s only delays the REAL
// outage verdict; a healthy-but-slow server now gets time to answer.
const HEALTH_TIMEOUT_MS = 15000;

export async function checkServerHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    await apiFetch(`/health/?_t=${Date.now()}`, {
      signal: controller.signal,
    });
    return true; // resolved => status 200
  } catch (err) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
