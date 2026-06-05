/**
 * settings.js — constantes globales del proyecto (patrón Config.ts de sleepio).
 *
 * Única fuente de verdad para la configuración del frontend: el resto del
 * código importa de aquí, nunca lee process.env directamente. Los valores
 * vienen de .env (REACT_APP_*) con defaults seguros para desarrollo.
 */

// Base URL del backend (nginx). 8080 para no chocar con otros proyectos
// locales que publican 8000 (ver .env del backend).
export const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080";

// Secret para firmar el JWT `client-assertion` (SINGLE_REQUEST_PROTECT).
// Debe coincidir con API_SECRET_KEY del backend.
export const API_SECRET_KEY = process.env.REACT_APP_API_KEY || "";

// Modo debug de la app. Activa herramientas de desarrollo visibles en la UI
// (p. ej. el momentum score en el head de cada card del feed).
// REACT_APP_DEBUG=true | false en .env — default: false (producción segura).
export const DEBUG =
  (process.env.REACT_APP_DEBUG || "false").trim().toLowerCase() === "true";
