/**
 * Normalizes text pasted from external sources (X/Twitter, docs, web pages)
 * to avoid artifacts:
 *   - CRLF / CR -> LF (consistent line breaks)
 *   - non-breaking space (U+00A0) -> normal space
 *   - invisible zero-width characters (U+200B..U+200D, U+FEFF) -> removed
 *     (they cause the "weird cursor" and the overlay misalignment)
 *   - 3+ consecutive breaks -> 2 (avoids huge gaps, preserves paragraphs)
 *
 * Preserves intentional line breaks: it only cleans up the noise.
 */
export function normalizePastedText(text) {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\n{3,}/g, "\n\n");
}
