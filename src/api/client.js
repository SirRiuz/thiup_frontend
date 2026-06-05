/**
 * Wrapper de fetch que añade base URL, encryption handling y errores tipados.
 *
 * El backend puede correr en dos modos según los flags ENCRYPTED_RESPONSE y
 * SINGLE_REQUEST_PROTECT:
 *
 *  - Modo cifrado (ENCRYPTED_RESPONSE=True): responses vienen con
 *    Content-Type: application/raw, ciphertext en el body y la key+IV en el
 *    header X-Response-Payload. Reutilizamos el helper `decrypt` de
 *    src/services/cripto.js — el mismo que usa el código legacy.
 *
 *  - Modo plano (ENCRYPTED_RESPONSE=False): responses vienen como JSON normal.
 *    Soportamos ambos en runtime mirando el Content-Type, sin requerir
 *    cambios de config en el frontend.
 *
 * Cuando SINGLE_REQUEST_PROTECT=True el backend exige el header
 * `client-assertion` (JWT firmado con REACT_APP_API_KEY). Lo enviamos siempre
 * — es inofensivo cuando el flag está apagado y necesario cuando está prendido.
 */

import { decrypt, getClientSing } from "../services/cripto";
import { SERVER_ERROR_EVENT } from "../contexts/ServerHealthContext";
import { BASE_URL } from "../settings";

const API_BASE_URL = BASE_URL;

const CRYPTO_CONTENT_TYPE = "application/raw";
const RESPONSE_PAYLOAD_HEADER = "x-response-payload";

export class APIError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.indexOf(CRYPTO_CONTENT_TYPE) !== -1) {
    const payload = response.headers.get(RESPONSE_PAYLOAD_HEADER);
    const rawBody = await response.text();
    if (!payload || !rawBody) {
      return null;
    }
    try {
      return decrypt({ payload, data: rawBody });
    } catch (err) {
      console.error("Failed to decrypt response payload:", err);
      return null;
    }
  }

  // Fallback: JSON plano (cuando ENCRYPTED_RESPONSE=False)
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}

/**
 * Realiza una request al backend.
 *
 * @param {string} url      Path relativo ('/threads/') o URL absoluta
 *                          (útil para usar `response.next` directo en paginación).
 * @param {object} options  Opciones de fetch, incluye `signal` para AbortController.
 * @returns {Promise<any>}  JSON descifrado.
 * @throws  {APIError}      Si response no es OK (con payload descifrado en .payload).
 */
export async function apiFetch(url, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  const headers = {
    Accept: "*/*",
    "client-assertion": getClientSing(),
    ...(options.headers || {}),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (err) {
    // Red caída / servidor inalcanzable: notifica (el ServerHealthContext
    // re-verifica el healthcheck). Los aborts del caller no cuentan.
    if (!err || err.name !== "AbortError") {
      window.dispatchEvent(new Event(SERVER_ERROR_EVENT));
    }
    throw err;
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    // Solo errores DE SERVIDOR (5xx) disparan la verificación de health —
    // 4xx (not found, bad request) no significan servidor caído.
    if (response.status >= 500) {
      window.dispatchEvent(new Event(SERVER_ERROR_EVENT));
    }
    throw new APIError(
      `API error ${response.status}: ${response.statusText}`,
      response.status,
      data
    );
  }

  return data;
}
