/**
 * Invisible Cap captcha solver (SHA-256 proof-of-work in Web Workers).
 *
 * ZERO CDN: the widget downloads its WASM and pako from jsdelivr by default;
 * here its official hooks (CAP_CUSTOM_WASM_URL / CAP_PAKO_URL) point at the
 * self-hosted files under /vendor/ (copied from node_modules by
 * scripts/copy-captcha-assets.js — versions pinned in package.json).
 *
 * Lazy load: the widget bundle is imported only when the backend reports
 * captcha_protect=true (GET /config/), so visitors of a captcha-less
 * deployment pay neither the import nor the PoW.
 */

import { getCaptchaEndpoint } from "../api/config";
import { PUBLIC_PATH } from "../settings";

let capInstance = null;
let solving = null;

async function getCap() {
  if (capInstance) return capInstance;

  const endpoint = getCaptchaEndpoint();
  // E_CAP0 = captcha required but no usable endpoint in the config.
  if (!endpoint) throw new Error("E_CAP0");

  // The hooks must exist BEFORE solving (the widget reads them on the fly).
  window.CAP_CUSTOM_WASM_URL = `${PUBLIC_PATH}/vendor/cap_wasm_bg.wasm`;
  window.CAP_PAKO_URL = `${PUBLIC_PATH}/vendor/pako_inflate.min.js`;

  const mod = await import("@cap.js/widget");
  const Cap = mod.default || window.Cap;
  // Headless instance: creates a hidden <cap-widget> — no UI, no interaction.
  capInstance = new Cap({ apiEndpoint: endpoint });
  return capInstance;
}

/**
 * Solves a challenge in the background and returns the single-use token.
 * SINGLE-FLIGHT: the widget ignores concurrent solve() calls (they'd resolve
 * to undefined), so simultaneous callers share the same resolution.
 */
export function solveCaptcha() {
  if (!solving) {
    solving = (async () => {
      const cap = await getCap();
      const result = await cap.solve();
      // E_CAP1 = the solver produced no token (widget abort/internal reset).
      if (!result || !result.token) throw new Error("E_CAP1");
      return result.token;
    })().finally(() => {
      solving = null;
    });
  }
  return solving;
}
