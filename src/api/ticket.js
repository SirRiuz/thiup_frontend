import { parseResponseBody } from "./decode";
import { dispatchRequest } from "./dispatch";
import { shouldUseGateway } from "./transportMode";

/**
 * Client-assertion manager (SINGLE_REQUEST_PROTECT).
 *
 * The client does NOT hold any secret nor sign anything: it requests a
 * short-lived ticket from the backend (GET /ticket/) and carries it as the
 * `client-assertion` header. It is cached in memory and refreshed before
 * expiring (amortized, suitable for Raspberry).
 *
 * TRANSPORTE: el ticket se obtiene por el MISMO canal que el resto —
 * por el gateway /{hash}/ cuando el modo cifrado está activo, o directo a
 * /ticket/ en modo plano. NO hay recursión: usa dispatchRequest (bajo nivel,
 * sin reintentos), no apiFetch. El gateway es AllowAny y la vista interna
 * /ticket/ también, así que pedir el ticket NO requiere tener un ticket
 * previo → se rompe el huevo-y-la-gallina del bootstrap.
 */

const REFRESH_BEFORE_MS = 60 * 1000;
const ASSUMED_TTL_MS = 300 * 1000;

let cachedTicket = null;
let expiresAt = 0;
let inFlight = null;

async function fetchTicket() {
  const res = await dispatchRequest({
    method: "GET",
    path: "/ticket/",
    gateway: shouldUseGateway(),
  });
  // E_TK1 = el endpoint del ticket respondió no-OK (status adjunto);
  // E_TK2 = respuesta OK pero sin ticket en el cuerpo. Códigos opacos: los
  // textos descriptivos mapeaban la arquitectura de assertions en el bundle.
  if (!res.ok) throw new Error(`E_TK1:${res.status}`);
  const data = await parseResponseBody(res);
  if (!data || !data.ticket) throw new Error("E_TK2");
  cachedTicket = data.ticket;
  expiresAt = Date.now() + ASSUMED_TTL_MS;
  return cachedTicket;
}

/**
 * Returns a valid Client-assertion (cached or freshly issued).
 * Dedup: concurrent requests share the SAME fetch promise.
 */
export async function getClientAssertion() {
  const fresh = cachedTicket && Date.now() < expiresAt - REFRESH_BEFORE_MS;
  if (fresh) return cachedTicket;
  if (!inFlight) {
    inFlight = fetchTicket().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Invalidates the cached ticket (e.g. after a 403): forces re-issuance. */
export function invalidateTicket() {
  cachedTicket = null;
  expiresAt = 0;
}

/**
 * Fuerza un ticket NUEVO ignorando la caché — para el refresh-and-retry de
 * apiFetch tras un 403. SINGLE-FLIGHT: varios 403 concurrentes comparten la
 * MISMA promesa → una sola petición de ticket; todos reintentan con el token
 * resultante. Sin recursión: usa dispatchRequest, no apiFetch.
 */
export function refreshTicket() {
  if (!inFlight) {
    inFlight = fetchTicket().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
