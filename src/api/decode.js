import { decrypt } from "../services/cripto";

/**
 * Decode ÚNICO de respuestas de la API — compartido por apiFetch (client.js)
 * y por la obtención del ticket (ticket.js), para que /ticket/ se descifre
 * por EXACTAMENTE el mismo camino que el resto de la API, sin duplicar la
 * cripto ni crear un import circular client↔ticket.
 *
 * Modo cifrado (ENCRYPTED_RESPONSE=True): Content-Type application/raw,
 * ciphertext en el body y key+IV en el header X-Response-Payload →
 * `decrypt` (services/cripto.js, NO se toca). Modo plano: JSON normal.
 */
const CRYPTO_CONTENT_TYPE = "application/raw";
const RESPONSE_PAYLOAD_HEADER = "x-response-payload";

export async function parseResponseBody(response) {
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

  // Fallback: plain JSON (when ENCRYPTED_RESPONSE=False)
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}
