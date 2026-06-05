/**
 * Healthcheck del backend — por apiFetch, con las MISMAS reglas estándar que
 * cualquier llamada de la app: cifrado E2E + client-assertion (single
 * request) + cache busting. Ya no es un fetch directo a un endpoint público.
 *
 * Lo ÚNICO que importa es el status: si apiFetch RESUELVE, hubo un 200
 * (servidor + DB + auth + cifrado OK). Cualquier fallo (no-200, auth, red,
 * timeout) => down.
 */

import { apiFetch } from "./client";

const HEALTH_TIMEOUT_MS = 5000;

export async function checkServerHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    await apiFetch(`/health/?_t=${Date.now()}`, {
      signal: controller.signal,
    });
    return true; // resolvió => status 200
  } catch (err) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
