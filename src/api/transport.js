import { parseResponseBody } from "./decode";
import { dispatchRequest } from "./dispatch";
import { invalidateTicket } from "./ticket";
import { getMode, setMode } from "./transportMode";

/**
 * Detección del MODO DE TRANSPORTE por SONDEO (probe) al gateway — gobernado
 * 100% por el backend (ENCRYPTED_RESPONSE), sin nada en el .env del FE.
 *
 * El probe intenta /config/ POR EL GATEWAY (POST /{token}/ con el sobre
 * {GET /config/}). No usa ticket (config es AllowAny). Inferencia:
 *   - 2xx que DESCIFRA bien            → modo CIFRADO (todo por gateway).
 *   - 404 con code === "GATEWAY_DISABLED" → modo NORMAL (todo directo legible).
 *   - cualquier OTRA cosa (404 genérico, token inválido cifrado, error de red,
 *     timeout, descifrado inválido) → AMBIGUO: NO se concluye normal. Se
 *     mantiene FAIL-CLOSED (cifrado) y se reintenta con backoff acotado.
 *
 * Sin bucles: máximo PROBE_MAX_ATTEMPTS; si no concluye, se queda en CIFRADO
 * (lo seguro). El modo se fija en UN único punto de verdad (transportMode).
 */
const PROBE_MAX_ATTEMPTS = 3;
const PROBE_BACKOFF_MS = 150;

let inFlight = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probeMode() {
  // Probe POR EL GATEWAY (gateway:true), sin ticket (config AllowAny).
  const res = await dispatchRequest({
    method: "GET",
    path: "/config/",
    gateway: true,
  });

  if (res.ok) {
    // Debe descifrar bien para confirmar el modo cifrado (si falla → ambiguo).
    await parseResponseBody(res);
    return "encrypted";
  }

  if (res.status === 404) {
    // Señal INEQUÍVOCA solo si el cuerpo trae el código específico. En modo
    // cifrado un 404 (p.ej. token inválido) viene cifrado → res.json() falla
    // → ambiguo (no se confunde con gateway_disabled).
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      /* cuerpo no-JSON / cifrado → ambiguo */
    }
    if (body && body.code === "GATEWAY_DISABLED") {
      return "normal";
    }
  }

  throw new Error("ambiguous probe result");
}

async function resolveMode() {
  for (let attempt = 1; attempt <= PROBE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const detected = await probeMode();
      setMode({ gateway: detected === "encrypted", resolved: true });
      return getMode();
    } catch (err) {
      // Ambiguo → fail-closed (NUNCA concluir normal por un fallo no
      // concluyente). Backoff acotado y reintento.
      if (attempt < PROBE_MAX_ATTEMPTS) {
        await sleep(attempt * PROBE_BACKOFF_MS);
      }
    }
  }

  // Sin conclusión tras los reintentos → quedarse en CIFRADO (seguro).
  invalidateTicket();
  setMode({ gateway: true, resolved: true });
  return getMode();
}

/**
 * Resuelve el modo UNA vez (cacheado). apiFetch lo espera antes de enviar.
 * Single-flight: peticiones concurrentes comparten la misma resolución.
 */
export async function ensureTransportMode() {
  if (getMode().resolved) return getMode();
  if (!inFlight) {
    inFlight = resolveMode().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
