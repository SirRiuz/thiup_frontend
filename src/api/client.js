/**
 * Fetch wrapper que añade base URL, transporte (gateway/directo), cifrado y
 * errores tipados.
 *
 * El backend corre en dos modos según ENCRYPTED_RESPONSE:
 *
 *  - Modo cifrado: TODA petición (ticket y config incluidos) se enruta por
 *    el GATEWAY de path rotativo /{hash}/ — el destino real (method, path,
 *    query, body) viaja dentro del sobre cifrado y el backend despacha
 *    internamente. La respuesta llega cifrada (X-Response-Payload) y se
 *    descifra con el `decrypt` existente. Uniformidad: todo se ve igual.
 *
 *  - Modo plano: llamadas directas y legibles a los endpoints reales.
 *
 * El modo se resuelve UNA vez al bootstrap (transport.js, fail-closed a
 * gateway). apiFetch NO conoce la cripto: orquesta retry + errores y delega
 * la salida en dispatchRequest (punto único). SINGLE_REQUEST_PROTECT: se
 * envía siempre el `client-assertion` (inocuo si el flag está off).
 */

import { parseResponseBody } from "./decode";
import { dispatchRequest, DispatchEncryptError } from "./dispatch";
import { getClientAssertion, refreshTicket } from "./ticket";
import { ensureTransportMode } from "./transport";
import { shouldUseGateway } from "./transportMode";
import {
  SERVER_ERROR_EVENT,
  NETWORK_ERROR_EVENT,
} from "../contexts/ServerHealthContext";
import { BASE_URL } from "../settings";

const API_BASE_URL = BASE_URL;

// Refresh-and-retry: máximo 3 INTENTOS por petición (original + 2 retries).
// Solo el 403 (ticket expirado) dispara refresh+retry; otros errores se
// propagan tal cual. Contador LOCAL por petición (nunca compartido).
const MAX_ATTEMPTS = 3;

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
 *                          (útil para usar `response.next` directo en paginación).
 * @param {object} options  Fetch options, incluye `signal` para AbortController.
 * @returns {Promise<any>}  Decrypted JSON.
 * @throws  {APIError}      Si la respuesta no es OK (payload descifrado en .payload).
 */
export async function apiFetch(url, options = {}) {
  // El modo (gateway vs directo) debe estar resuelto ANTES de enviar.
  // ensureTransportMode obtiene ticket+config por su propio canal de bajo
  // nivel (no por apiFetch) → sin recursión. Fail-closed: ante duda, gateway.
  await ensureTransportMode();

  // Destino real: separamos path+query (sirve para paths relativos y para
  // los `next` absolutos de paginación). El body se normaliza a string.
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
    // Client-assertion EMITIDO POR EL SERVER (el FE no tiene secreto). En un
    // reintento (attempt > 1) forzamos un ticket nuevo.
    let assertion = "";
    try {
      assertion =
        attempt === 1 ? await getClientAssertion() : await refreshTicket();
    } catch (err) {
      /* sin ticket: la petición sale sin assertion y el backend la rechaza */
    }

    let response;
    try {
      // Punto ÚNICO de salida. Re-arma el sobre del gateway en CADA intento
      // → sobre fresco en el retry (sin doble cifrado, sin stream consumido).
      response = await dispatchRequest({
        method,
        path,
        query,
        body,
        assertion,
        gateway: shouldUseGateway(),
        signal: options.signal,
        extraHeaders: options.headers,
      });
    } catch (err) {
      // Política "cifrado o nada": si no se pudo cifrar/derivar el sobre, la
      // petición NO salió; fallamos local con el shape estándar (jamás plano).
      if (err instanceof DispatchEncryptError) {
        // E_ENC1 = no se pudo cifrar el sobre local (la petición no salió).
        // Mensaje opaco; el shape (status 0 + detail) se conserva idéntico
        // para el manejo de errores existente.
        throw new APIError("E_ENC1", 0, {
          detail: "encryption_failed",
        });
      }
      // La petición FALLÓ SIN respuesta HTTP (red caída / server inalcanzable):
      // es un error de RED, no de servidor → evento distinto para que se muestre
      // la pantalla de "sin conexión". Los aborts del consumidor no cuentan.
      if (!err || err.name !== "AbortError") {
        window.dispatchEvent(new Event(NETWORK_ERROR_EVENT));
      }
      throw err;
    }

    if (response.ok) {
      return parseResponseBody(response);
    }

    // 403 = ticket expirado: si quedan intentos, refrescar (single-flight) y
    // reintentar. Otros errores (400/404/5xx) NO se reintentan.
    if (response.status === 403 && attempt < MAX_ATTEMPTS) {
      try {
        await refreshTicket();
        continue; // reintentar con el token fresco
      } catch (err) {
        /* el refresh falló: caemos a propagar el 403 original abajo */
      }
    }

    // Sin reintento (o agotados): propagar con el MISMO shape de hoy.
    const data = await parseResponseBody(response);
    if (response.status >= 500) {
      window.dispatchEvent(new Event(SERVER_ERROR_EVENT));
    }
    throw new APIError(
      `API error ${response.status}: ${response.statusText}`,
      response.status,
      data
    );
  }
}
