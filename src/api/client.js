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

// Refresh-and-retry: máximo 3 INTENTOS por petición (original + 2 retries).
// Solo el 403 dispara refresh+retry — ticket expirado o, en escrituras,
// pase humano expirado (code CAPTCHA_FAILED); otros errores se propagan tal
// cual. Contador LOCAL por petición (nunca compartido).
const MAX_ATTEMPTS = 3;

// Escrituras que exigen el pase humano (CAPTCHA_PROTECT): espejo EXACTO de
// las acciones decoradas con @human_validator en el backend. Los POST de
// solo lectura (/threads/foryou/, /threads/closeyou/) NO están aquí.
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

    // Pase humano (solo escrituras protegidas): viaja como header REAL de la
    // petición exterior, igual que client-assertion. Si no se pudo obtener
    // (Cap caído, solver falló), la petición sale SIN pase y el backend
    // responde su 403/503 tipado — el error visible es el del servidor.
    let extraHeaders = options.headers;
    if (needsHumanPass(method, path)) {
      try {
        const pass = await getHumanPass();
        if (pass) {
          extraHeaders = { ...(options.headers || {}), "x-human-pass": pass };
        }
      } catch (err) {
        /* sin pase: el backend decide */
      }
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
        extraHeaders,
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

    // 403: si quedan intentos, se distingue POR EL CÓDIGO del cuerpo qué
    // credencial expiró — CAPTCHA_FAILED → renovar el pase humano (resolver
    // otro PoW); cualquier otro 403 → refrescar el ticket (comportamiento de
    // siempre). Otros errores (400/404/5xx) NO se reintentan.
    if (response.status === 403 && attempt < MAX_ATTEMPTS) {
      let body403 = null;
      try {
        body403 = await parseResponseBody(response);
      } catch (err) {
        /* cuerpo ilegible: se trata como 403 de ticket */
      }
      try {
        if (body403 && body403.code === "CAPTCHA_FAILED") {
          invalidateHumanPass();
          await getHumanPass();
        } else {
          await refreshTicket();
        }
        continue; // reintentar con la credencial fresca
      } catch (err) {
        /* la renovación falló: propagar el 403 original abajo */
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

    // Sin reintento (o agotados): propagar con el MISMO shape de hoy.
    const data = await parseResponseBody(response);
    // Retries exhausted and the backend STILL rejects the human pass: the
    // session could not be verified as human → anti-scraping wall.
    if (response.status === 403 && data?.code === "CAPTCHA_FAILED") blockAsBot();
    // El 503 CAPTCHA_UNAVAILABLE (servidor Cap caído) NO es una caída del
    // backend: se propaga al call site sin disparar el aviso global.
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
