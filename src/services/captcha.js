/**
 * Solver invisible del captcha Cap (proof-of-work SHA-256 en Web Workers).
 *
 * CERO CDN: el widget por defecto descarga su WASM y pako desde jsdelivr;
 * aquí se apuntan sus hooks oficiales (CAP_CUSTOM_WASM_URL / CAP_PAKO_URL)
 * a los ficheros auto-hosteados en /vendor/ (copiados desde node_modules por
 * scripts/copy-captcha-assets.js — versiones pineadas en package.json).
 *
 * Carga perezosa: el bundle del widget solo se importa si el backend reporta
 * captcha_protect=true (GET /config/), así los visitantes de un despliegue
 * sin captcha no pagan ni el import ni el PoW.
 */

import { getCaptchaEndpoint } from "../api/config";
import { PUBLIC_PATH } from "../settings";

let capInstance = null;
let solving = null;

async function getCap() {
  if (capInstance) return capInstance;

  const endpoint = getCaptchaEndpoint();
  // E_CAP0 = captcha requerido sin endpoint utilizable en la config.
  if (!endpoint) throw new Error("E_CAP0");

  // Los hooks deben existir ANTES de resolver (el widget los lee al vuelo).
  window.CAP_CUSTOM_WASM_URL = `${PUBLIC_PATH}/vendor/cap_wasm_bg.wasm`;
  window.CAP_PAKO_URL = `${PUBLIC_PATH}/vendor/pako_inflate.min.js`;

  const mod = await import("@cap.js/widget");
  const Cap = mod.default || window.Cap;
  // Instancia headless: crea un <cap-widget> oculto — sin UI, sin interacción.
  capInstance = new Cap({ apiEndpoint: endpoint });
  return capInstance;
}

/**
 * Resuelve un challenge en segundo plano y devuelve el token de un solo uso.
 * SINGLE-FLIGHT: el widget ignora solve() concurrentes (resolvería undefined),
 * así que las llamadas simultáneas comparten la misma resolución.
 */
export function solveCaptcha() {
  if (!solving) {
    solving = (async () => {
      const cap = await getCap();
      const result = await cap.solve();
      // E_CAP1 = el solver no produjo token (abort/reset interno del widget).
      if (!result || !result.token) throw new Error("E_CAP1");
      return result.token;
    })().finally(() => {
      solving = null;
    });
  }
  return solving;
}
