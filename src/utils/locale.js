/**
 * Client language/region detection — ONLY navigator.language.
 *
 * navigator.language (e.g. "es-CO") carries TWO pieces of data:
 *   - language "es"  → used by the For You language FILTER (hard, with
 *     a fallback in the backend).
 *   - country  "CO"  → saved as the thread's `region` on creation and
 *     feeds the For You regional boost.
 *
 * No IP/GeoIP: the client declares, the backend persists and filters.
 */

/** Client language, lowercase ("es"). Defaults to 'es' if there is no locale. */
export function getLanguage() {
  const locale = (typeof navigator !== "undefined" && navigator.language) || "";
  const lang = locale.split("-")[0].trim().toLowerCase();
  return lang || "es";
}

/** Country code from the locale, uppercase ("CO") — or null if it has no country. */
export function getCountryCode() {
  const locale = (typeof navigator !== "undefined" && navigator.language) || "";
  const country = locale.split("-")[1]?.trim().toUpperCase() || "";
  return country || null;
}
