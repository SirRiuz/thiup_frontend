/**
 * Regex compartido de hashtags — único punto de verdad del frontend.
 *
 * Set de caracteres: letras Unicode (\p{L}: á,é,í,ó,ú,ñ,ü,...), números
 * (\p{N}), underscore y guion (#encrypted-messaging). El flag 'u' es
 * OBLIGATORIO para que \p{...} funcione.
 *
 * Por qué: el \w de JavaScript es ASCII-only, así que /#[\w-]+/ cortaba
 * #méxico en la 'é' (resaltaba solo '#m'). \p{L} cubre cualquier letra.
 *
 * Debe coincidir con el regex del backend (apps/tags/methods/tags.py) para
 * que todo hashtag detectado aquí exista igual como Tag al guardar el post.
 */

const HASHTAG_BODY = "[\\p{L}\\p{N}_-]+";

// Para text.match(...) — extraer todos los hashtags de un texto.
export const HASHTAG_RE = new RegExp(`#${HASHTAG_BODY}`, "gu");

// Para text.split(...) — partir el texto conservando los hashtags (captura).
export const HASHTAG_SPLIT_RE = new RegExp(`(#${HASHTAG_BODY})`, "gu");

// Para loops con .exec() (estado interno lastIndex): instancia fresca.
export const makeHashtagRegex = () => new RegExp(`#(${HASHTAG_BODY})`, "gu");

/**
 * Detección de intención de TAG en el texto de búsqueda: si EMPIEZA con '#'
 * (solo al inicio — '#' en medio sigue siendo query), devuelve el tag
 * normalizado (sin '#', primera palabra, lowercase — los tags son una sola
 * palabra); si no, null. '#' solo / vacío → null.
 *
 *   '#peru'           → 'peru'
 *   '#Peru noticias'  → 'peru'
 *   '#  peru'         → 'peru'
 *   'covid #vacuna'   → null (query normal)
 *   '#' / ''          → null
 */
export function extractTagFromSearch(text) {
  const trimmed = (text || "").trim();
  if (!trimmed.startsWith("#")) return null;
  const firstWord = trimmed.slice(1).trim().split(/\s+/)[0] || "";
  return firstWord ? firstWord.toLowerCase() : null;
}
