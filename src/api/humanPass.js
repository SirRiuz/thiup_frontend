/**
 * Human-pass manager (CAPTCHA_PROTECT) — espejo estructural de ticket.js.
 *
 * Flujo: el solver invisible (services/captcha.js) produce un token Cap de un
 * solo uso → se canjea en POST /captcha/verify/ → el backend devuelve un JWT
 * corto ("pase humano", ligado a la mask) que las ESCRITURAS llevan en el
 * header `x-human-pass`. Cacheado en memoria y renovado antes de expirar;
 * al expirar en el server (403 CAPTCHA_FAILED) apiFetch invalida y reintenta.
 *
 * Sin recursión: usa dispatchRequest (bajo nivel), no apiFetch — igual que
 * ticket.js y transport.js.
 */

import { isCaptchaEnabled } from "./config";
import { parseResponseBody } from "./decode";
import { dispatchRequest } from "./dispatch";
import { getClientAssertion } from "./ticket";
import { shouldUseGateway } from "./transportMode";
import { solveCaptcha } from "../services/captcha";

// Renovar un poco antes del expires_in real para no gastar un intento en un
// pase que muere en vuelo.
const REFRESH_BEFORE_MS = 30 * 1000;
const FALLBACK_TTL_MS = 600 * 1000;

let cachedPass = null;
let expiresAt = 0;
let inFlight = null;

async function fetchPass() {
  const token = await solveCaptcha();

  // El endpoint exige client-assertion (SINGLE_REQUEST_PROTECT); si no hay
  // ticket la petición sale sin él y el backend la rechaza — como apiFetch.
  let assertion = "";
  try {
    assertion = await getClientAssertion();
  } catch (err) {
    /* sin ticket */
  }

  const res = await dispatchRequest({
    method: "POST",
    path: "/captcha/verify/",
    body: JSON.stringify({ token }),
    assertion,
    gateway: shouldUseGateway(),
  });
  // E_HP1 = el canje del captcha respondió no-OK (status adjunto);
  // E_HP2 = respuesta OK pero sin pase en el cuerpo. Códigos opacos.
  if (!res.ok) throw new Error(`E_HP1:${res.status}`);
  const data = await parseResponseBody(res);
  if (!data || !data.pass) throw new Error("E_HP2");

  cachedPass = data.pass;
  const ttlMs = Number(data.expires_in) > 0
    ? Number(data.expires_in) * 1000
    : FALLBACK_TTL_MS;
  expiresAt = Date.now() + ttlMs;
  return cachedPass;
}

/**
 * Devuelve un pase humano válido (cacheado o recién canjeado), o null si el
 * captcha está apagado según /config/. Dedup: llamadas concurrentes comparten
 * la MISMA promesa (un solo PoW aunque disparen varias escrituras a la vez).
 */
export async function getHumanPass() {
  if (!isCaptchaEnabled()) return null;
  const fresh = cachedPass && Date.now() < expiresAt - REFRESH_BEFORE_MS;
  if (fresh) return cachedPass;
  if (!inFlight) {
    inFlight = fetchPass().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Invalida el pase cacheado (p.ej. tras un 403 CAPTCHA_FAILED). */
export function invalidateHumanPass() {
  cachedPass = null;
  expiresAt = 0;
}

/**
 * Pre-calienta el pase en segundo plano (fire-and-forget): se dispara al
 * abrir un composer/modal para que la escritura posterior salga sin esperar
 * el PoW. Inocuo si el captcha está apagado o el pase ya está fresco.
 */
export function warmHumanPass() {
  getHumanPass().catch(() => {});
}
