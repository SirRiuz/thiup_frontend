import React from "react";
import { HASHTAG_SPLIT_RE } from "../../utils/hashtags";
import { splitByMatch, normalizeForMatch } from "../../utils/matchText";

/**
 * Formatea un número con suffix K/M.
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
 * Renderiza un segmento de texto plano, con highlighting opcional de query.
 * Insensible a tildes y mayúsculas (espejo del unaccent del backend): buscar
 * 'peru' resalta 'PERÚ'. El texto mostrado es siempre el ORIGINAL.
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
 * Renderiza texto con hashtags resaltados.
 *
 * @param {string} text
 * @param {string} hashtagClassName  Clase CSS para hashtags normales.
 * @param {function} onHashtagClick  Handler(tagName, event) opcional.
 * @param {object} options  Opcional:
 *   - highlightQuery: string para resaltar matches con <mark> dentro del texto normal
 *   - highlightClassName: clase CSS para los <mark>
 *   - activeTag: nombre del tag activo (sin #) — se renderiza con override
 *   - activeTagClassName: clase CSS de override cuando un hashtag matchea activeTag
 *
 * Backward compatible: si no se pasa `options`, comportamiento idéntico al original.
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

  // Tag buscado normalizado (sin '#', trim, lowercase, SIN tildes — espejo
  // del unaccent del backend) para comparar EXACTO: buscar 'peru' resalta
  // '#perú' y viceversa. '#video' NO matchea '#videoviral' (igualdad
  // estricta, no substring).
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
          {part}
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
