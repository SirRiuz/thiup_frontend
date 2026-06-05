/**
 * Normaliza texto pegado de fuentes externas (X/Twitter, docs, paginas web)
 * para evitar artefactos:
 *   - CRLF / CR -> LF (saltos consistentes)
 *   - non-breaking space (U+00A0) -> espacio normal
 *   - caracteres zero-width invisibles (U+200B..U+200D, U+FEFF) -> eliminados
 *     (son la causa del "cursor raro" y de la desalineacion del overlay)
 *   - 3+ saltos seguidos -> 2 (evita huecos enormes, preserva parrafos)
 *
 * Preserva los saltos de linea intencionales: solo limpia el ruido.
 */
export function normalizePastedText(text) {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\n{3,}/g, "\n\n");
}
