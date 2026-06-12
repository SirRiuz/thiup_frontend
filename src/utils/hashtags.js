/**
 * Shared hashtag regex — the frontend's single source of truth.
 *
 * Character set: Unicode letters (\p{L}: any accented or non-ASCII letter), numbers
 * (\p{N}), underscore and hyphen (#encrypted-messaging). The 'u' flag is
 * MANDATORY for \p{...} to work.
 *
 * Why: JavaScript's \w is ASCII-only, so /#[\w-]+/ would cut
 * #méxico at the 'é' (highlighting only '#m'). \p{L} covers any letter.
 *
 * Must match the backend regex (apps/tags/methods/tags.py) so that
 * every hashtag detected here exists identically as a Tag when saving the post.
 */

const HASHTAG_BODY = "[\\p{L}\\p{N}_-]+";

// For text.match(...) — extract all hashtags from a text.
export const HASHTAG_RE = new RegExp(`#${HASHTAG_BODY}`, "gu");

// For text.split(...) — split the text keeping the hashtags (capture group).
export const HASHTAG_SPLIT_RE = new RegExp(`(#${HASHTAG_BODY})`, "gu");

// For loops with .exec() (internal lastIndex state): a fresh instance.
export const makeHashtagRegex = () => new RegExp(`#(${HASHTAG_BODY})`, "gu");

/**
 * Detection of TAG intent in the search text: if it STARTS with '#'
 * (only at the start — '#' in the middle is still a query), returns the tag
 * normalized (no '#', first word, lowercase — tags are a single
 * word); otherwise, null. '#' alone / empty → null.
 *
 *   '#peru'           → 'peru'
 *   '#Peru noticias'  → 'peru'
 *   '#  peru'         → 'peru'
 *   'covid #vacuna'   → null (normal query)
 *   '#' / ''          → null
 */
export function extractTagFromSearch(text) {
  const trimmed = (text || "").trim();
  if (!trimmed.startsWith("#")) return null;
  const firstWord = trimmed.slice(1).trim().split(/\s+/)[0] || "";
  return firstWord ? firstWord.toLowerCase() : null;
}
