/**
 * Detección de idioma/región del cliente — SOLO navigator.language.
 *
 * navigator.language (ej "es-CO") trae DOS datos:
 *   - idioma "es"  → lo usa el FILTRO de idioma del For You (duro, con
 *     fallback en el backend).
 *   - país  "CO"   → se guarda como `region` del hilo al crearlo y
 *     alimenta el boost regional del For You.
 *
 * Nada de IP/GeoIP: el cliente declara, el backend persiste y filtra.
 */

/** Idioma del cliente, lowercase ("es"). Default 'es' si no hay locale. */
export function getLanguage() {
  const locale = (typeof navigator !== "undefined" && navigator.language) || "";
  const lang = locale.split("-")[0].trim().toLowerCase();
  return lang || "es";
}

/** Country code del locale, uppercase ("CO") — o null si no trae país. */
export function getCountryCode() {
  const locale = (typeof navigator !== "undefined" && navigator.language) || "";
  const country = locale.split("-")[1]?.trim().toUpperCase() || "";
  return country || null;
}
