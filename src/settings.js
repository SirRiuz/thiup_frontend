/**
 * settings.js — global project constants (centralized config pattern).
 *
 * Single source of truth for the frontend configuration: the rest of the
 * code imports from here, never reads process.env directly. The values
 * come from .env (REACT_APP_*) with safe defaults for development.
 */

// Backend (nginx) base URL. 8080 to avoid clashing with other local
// projects that publish 8000 (see the backend's .env).
export const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080";

// SINGLE_REQUEST_PROTECT: the Client-assertion is NO longer signed on the
// client. The secret used to live here (REACT_APP_API_KEY) and was
// extractable from the bundle → anyone could forge assertions. NOW the
// backend ISSUES the ticket (GET /ticket/, signed server-side) and the
// client only carries it. There is no secret in the frontend.
export const TICKET_ENDPOINT = "/ticket/";

// Semilla del PATH ROTATIVO del gateway. Con el cifrado activo, apiFetch
// reescribe TODA llamada (ticket y config INCLUIDOS) a un POST a /{hash}/,
// donde hash = HMAC(semilla, fecha_UTC) — rota a diario. El destino real
// (method, path, query, body) viaja dentro del sobre cifrado y el backend
// despacha internamente. La semilla vive en el bundle → es OFUSCACIÓN
// ROTATIVA, NO un secreto (un atacante con el bundle deriva el path); frena
// escaneo casual y da uniformidad de tráfico. Debe coincidir con
// GATEWAY_SEED del backend.
export const GATEWAY_SEED =
  process.env.REACT_APP_GATEWAY_SEED || "thiup-rotating-gateway-seed";

// App debug mode. Enables development tools visible in the UI
// (e.g. the momentum score in the head of each feed card).
// REACT_APP_DEBUG=true | false in .env — default: false (safe for production).
export const DEBUG =
  (process.env.REACT_APP_DEBUG || "false").trim().toLowerCase() === "true";

// Base path where CRA serves the public/ dir (empty at the root). Used to
// reference the self-hosted captcha solver assets (public/vendor/) — no CDN.
export const PUBLIC_PATH = process.env.PUBLIC_URL || "";
