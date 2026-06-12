/**
 * Saneo del query de búsqueda — util compartida por TODOS los caminos del
 * FE (input, ?q= de la URL, click de hashtag, búsqueda reciente).
 *
 * Cortesía/UX: el FE nunca fabrica una request inválida. La DEFENSA real
 * es server-side (el backend rechaza > MAX con 400 aunque el FE no exista).
 * El tope DEBE coincidir con MAX_QUERY_LENGTH del backend.
 */
export const MAX_QUERY_LENGTH = 100;

/** trim + truncado al tope. Acepta cualquier entrada, nunca lanza. */
export function sanitizeQuery(text) {
  return (text || "").trim().slice(0, MAX_QUERY_LENGTH);
}
