/**
 * Matching de texto insensible a tildes y mayúsculas, para el RESALTADO del
 * término buscado. Espejo del backend (unaccent + icontains): lo que el
 * backend considera coincidencia, el frontend lo resalta.
 *
 * Clave del mapeo de índices: el texto se normaliza primero a NFC (tildes
 * precomputadas: 'Ú' = 1 char). removeAccents ('Ú'→'U') y toLowerCase
 * preservan la longitud 1:1 para este charset, así que los índices hallados
 * en el texto normalizado mapean DIRECTO al original — el resaltado muestra
 * el texto ORIGINAL (PERÚ, con su tilde y mayúsculas) en posiciones exactas.
 */

export function removeAccents(str) {
  // NFD descompone ('é' -> 'e' + U+0301) y se eliminan las combining marks.
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeForMatch(str) {
  return removeAccents((str || "").normalize("NFC")).toLowerCase();
}

/**
 * Parte `text` en segmentos [{ text, match }] donde match=true son TODAS las
 * ocurrencias de `query`, comparando sin tildes ni case. Los segmentos
 * conservan el texto original. Query vacío => un solo segmento sin match.
 */
export function splitByMatch(text, query) {
  const original = (text || "").normalize("NFC");
  const normQuery = normalizeForMatch(query);
  if (!normQuery || !original) {
    return [{ text: original, match: false }];
  }

  const normText = normalizeForMatch(original);
  // Safety: si algún carácter exótico rompió el mapeo 1:1, mejor no resaltar
  // que resaltar desfasado.
  if (normText.length !== original.length) {
    return [{ text: original, match: false }];
  }

  const segments = [];
  let last = 0;
  let i = normText.indexOf(normQuery);
  while (i !== -1) {
    if (i > last) {
      segments.push({ text: original.slice(last, i), match: false });
    }
    segments.push({ text: original.slice(i, i + normQuery.length), match: true });
    last = i + normQuery.length;
    i = normText.indexOf(normQuery, last);
  }
  if (last < original.length) {
    segments.push({ text: original.slice(last), match: false });
  }
  return segments;
}
