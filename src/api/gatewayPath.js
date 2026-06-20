const CryptoJS = require("crypto-js");
const { GATEWAY_SEED } = require("../settings");

/**
 * PATH ÚNICO POR REQUEST del gateway — ESPEJO EXACTO del backend
 * (app/methods/gateway_path.py):
 *
 *     nonce  = aleatorio (CSPRNG) por petición
 *     token  = HMAC-SHA256(key=semilla, msg=nonce) truncado a 24 hex
 *     path   = /{token}/
 *
 * Cada request usa un /{token}/ DISTINTO → genera RUIDO (ensucia logs,
 * confunde a observadores casuales, ningún path revela el endpoint real).
 * El nonce viaja DENTRO del sobre cifrado (nunca en la URL ni en claro); el
 * backend recomputa el token desde el nonce y lo compara en tiempo
 * constante. La semilla es ofuscación/ruido (vive en el bundle), NO un
 * secreto, y NO firma nada crítico. CryptoJS.HmacSHA256(mensaje, clave) →
 * hex en minúsculas, igual que hashlib en Python.
 */

// DEBE coincidir con TOKEN_LEN del backend.
const TOKEN_LEN = 24;
const NONCE_BYTES = 16; // 128 bits de aleatoriedad por request

// CSPRNG del navegador (window.crypto.getRandomValues). En tests, jsdom lo
// recibe vía polyfill en setupTests.js.
function _crypto() {
  const c = typeof window !== "undefined" && window.crypto;
  if (!c || !c.getRandomValues) {
    // E_GW1 = CSPRNG del navegador no disponible. Código opaco a propósito:
    // un texto descriptivo en el bundle regala arquitectura (el mapeo vive en
    // este comentario, que Terser elimina del build).
    throw new Error("E_GW1");
  }
  return c;
}

function makeNonce() {
  const bytes = new Uint8Array(NONCE_BYTES);
  _crypto().getRandomValues(bytes);
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function derive(nonce) {
  return CryptoJS.HmacSHA256(nonce, GATEWAY_SEED)
    .toString()
    .slice(0, TOKEN_LEN);
}

/**
 * Genera un path ÚNICO para UNA petición. Devuelve { path, nonce }: `path`
 * (/{token}/) va en la URL y `nonce` se incluye DENTRO del sobre cifrado
 * para que el backend recompute y verifique el token. Llamar UNA vez por
 * intento (el retry genera nonce/token NUEVOS → no se reusa nada).
 */
function newGatewayPath() {
  const nonce = makeNonce();
  return { path: `/${derive(nonce)}/`, nonce };
}

module.exports = { newGatewayPath, derive, makeNonce };
