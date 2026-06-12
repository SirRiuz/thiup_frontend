/**
 * Accent- and case-insensitive text matching, for HIGHLIGHTING the
 * searched term. Mirror of the backend (unaccent + icontains): whatever the
 * backend considers a match, the frontend highlights.
 *
 * Key to the index mapping: the text is first normalized to NFC (precomputed
 * accents: 'Ú' = 1 char). removeAccents ('Ú'→'U') and toLowerCase
 * preserve the 1:1 length for this charset, so the indices found
 * in the normalized text map DIRECTLY to the original — the highlight shows
 * the ORIGINAL text (PERÚ, with its accent and uppercase) at exact positions.
 */

export function removeAccents(str) {
  // NFD decomposes ('é' -> 'e' + U+0301) and the combining marks are removed.
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeForMatch(str) {
  return removeAccents((str || "").normalize("NFC")).toLowerCase();
}

/**
 * Splits `text` into segments [{ text, match }] where match=true are ALL the
 * occurrences of `query`, comparing without accents or case. The segments
 * keep the original text. Empty query => a single segment without a match.
 */
export function splitByMatch(text, query) {
  const original = (text || "").normalize("NFC");
  const normQuery = normalizeForMatch(query);
  if (!normQuery || !original) {
    return [{ text: original, match: false }];
  }

  const normText = normalizeForMatch(original);
  // Safety: if some exotic character broke the 1:1 mapping, better not to
  // highlight than to highlight off-position.
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
