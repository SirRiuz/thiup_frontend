import { encrypt } from "../services/cripto";
import { newGatewayPath } from "./gatewayPath";
import { BASE_URL } from "../settings";

/**
 * Error de cifrado/derivación del sobre del gateway. apiFetch lo traduce al
 * shape de error estándar de la app: la política es "cifrado o nada" — si no
 * se puede cifrar, la petición NO se envía (jamás cae a directo en claro).
 */
export class DispatchEncryptError extends Error {}

/**
 * PUNTO ÚNICO de salida HTTP. Envía una petición de DOS formas según el modo:
 *
 *   gateway=true  → sella {method, path, query, body} en el sobre cifrado
 *                   existente y lo emite como POST /{hash}/ (path rotativo).
 *                   Uniformidad: todo se ve igual en la red.
 *   gateway=false → llamada directa y legible al endpoint real (modo plano).
 *
 * NO reintenta ni decodifica (de eso se encargan apiFetch y parseResponseBody).
 * Reutiliza el cifrado existente (encrypt) — cero cripto nueva. Si el cifrado
 * falla, lanza DispatchEncryptError y NO emite nada.
 *
 * @returns {Promise<Response>} la Response cruda del fetch.
 */
export function dispatchRequest({
  method,
  path,
  query,
  body,
  assertion,
  gateway,
  signal,
  extraHeaders,
}) {
  const headers = { Accept: "*/*", ...(extraHeaders || {}) };
  if (assertion) headers["client-assertion"] = assertion;
  const verb = (method || "GET").toUpperCase();
  const qs = query ? `?${query}` : "";

  if (gateway) {
    // Path ÚNICO por request: nonce nuevo → token nuevo → /{token}/. El
    // nonce viaja DENTRO del sobre (nunca en la URL); el backend lo recomputa
    // y verifica. El destino real también va en el sobre.
    const { path: gwPath, nonce } = newGatewayPath();
    const inner = JSON.stringify({
      method: verb,
      path,
      query: query || "",
      body: body == null ? null : body,
      nonce,
    });
    let envelope;
    try {
      envelope = encrypt(inner);
    } catch (err) {
      throw new DispatchEncryptError("Local request encryption failed.");
    }
    headers["X-Request-Payload"] = envelope.payload;
    headers["Content-Type"] = "application/raw";
    return fetch(`${BASE_URL}${gwPath}`, {
      method: "POST",
      headers,
      body: envelope.data,
      signal,
    });
  }

  // Modo directo y legible (flag off).
  if (body != null && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${BASE_URL}${path}${qs}`, {
    method: verb,
    headers,
    body: body == null ? undefined : body,
    signal,
  });
}
