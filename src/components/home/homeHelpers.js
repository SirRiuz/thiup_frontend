import React from "react";
import { HASHTAG_SPLIT_RE } from "../../utils/hashtags";
import { splitByMatch, normalizeForMatch } from "../../utils/matchText";

/**
 * Formats a number with a K/M suffix.
 *   487 → '487'
 *   1200 → '1.2K'
 *   3400 → '3.4K'
 *   15000 → '15K'
 *   1500000 → '1.5M'
 */
export function formatCount(n) {
  if (n < 1000) return String(n);
  if (n < 1000000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  const m = n / 1000000;
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}

/**
 * Renders a plain text segment, with optional query highlighting.
 * Accent- and case-insensitive (mirror of the backend's unaccent): searching
 * 'peru' highlights 'PERÚ'. The displayed text is always the ORIGINAL.
 */
function renderTextSegment(text, query, className, keyPrefix) {
  if (!query || !className || !text) {
    return <React.Fragment key={keyPrefix}>{text}</React.Fragment>;
  }
  const segments = splitByMatch(text, query);
  return (
    <React.Fragment key={keyPrefix}>
      {segments.map((segment, idx) =>
        segment.match ? (
          <mark key={`${keyPrefix}-m-${idx}`} className={className}>
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={`${keyPrefix}-t-${idx}`}>
            {segment.text}
          </React.Fragment>
        )
      )}
    </React.Fragment>
  );
}

/**
 * Renders text with highlighted hashtags.
 *
 * @param {string} text
 * @param {string} hashtagClassName  CSS class for normal hashtags.
 * @param {function} onHashtagClick  Optional Handler(tagName, event).
 * @param {object} options  Optional:
 *   - highlightQuery: string to highlight matches with <mark> inside the normal text
 *   - highlightClassName: CSS class for the <mark>s
 *   - activeTag: name of the active tag (without #) — rendered with override
 *   - activeTagClassName: override CSS class when a hashtag matches activeTag
 *
 * Backward compatible: if `options` is not passed, behavior identical to the original.
 */
export function renderTextWithHashtags(
  text,
  hashtagClassName,
  onHashtagClick,
  options
) {
  if (!text) return null;
  const { highlightQuery, highlightClassName, activeTag, activeTagClassName } =
    options || {};

  // Searched tag normalized (without '#', trim, lowercase, WITHOUT accents —
  // mirror of the backend's unaccent) to compare EXACTLY: searching 'peru'
  // highlights '#perú' and vice versa. '#video' does NOT match '#videoviral'
  // (strict equality, not substring).
  const normalizedActiveTag = normalizeForMatch(
    (activeTag || "").trim().replace(/^#/, "")
  );

  const parts = text.split(HASHTAG_SPLIT_RE);
  return parts.map((part, idx) => {
    if (part.startsWith("#")) {
      const tagName = part.slice(1);
      const isActive =
        Boolean(normalizedActiveTag) &&
        normalizeForMatch(tagName) === normalizedActiveTag;
      const className =
        isActive && activeTagClassName ? activeTagClassName : hashtagClassName;
      return (
        <span
          key={`tag-${idx}-${tagName}`}
          className={className}
          onClick={(e) => {
            e.stopPropagation();
            if (onHashtagClick) onHashtagClick(tagName, e);
          }}
        >
          {/* Highlight the searched term even when it falls inside a hashtag
              (e.g. 'dns' inside '#dns'). The match runs over the tag NAME and
              the '#' is folded into the FIRST segment — so when the match
              starts at the name's beginning (searching 'motos' or '#motos'),
              the WHOLE '#motos' token lights up, # included; a mid-name match
              ('oto') leaves '#m' unmarked as expected. The <mark> nests
              inside the hashtag span, preserving its color/link style. */}
          {highlightQuery && highlightClassName
            ? splitByMatch(tagName, highlightQuery).map((seg, i) => {
                const textOut = i === 0 ? `#${seg.text}` : seg.text;
                return seg.match ? (
                  <mark
                    key={`tag-seg-${idx}-m-${i}`}
                    className={highlightClassName}
                  >
                    {textOut}
                  </mark>
                ) : (
                  <React.Fragment key={`tag-seg-${idx}-t-${i}`}>
                    {textOut}
                  </React.Fragment>
                );
              })
            : part}
        </span>
      );
    }
    return renderTextSegment(
      part,
      highlightQuery,
      highlightClassName,
      `seg-${idx}`
    );
  });
}
