import React from "react";
import { splitByMatch } from "../../utils/matchText";
import styles from "../../styles/components/search/SearchSuggestions.module.css";

/**
 * Dropdown de autocomplete (tipo Google, keywords — no resultados completos).
 *
 * Items (los arma el padre con buildSuggestionItems):
 *   { kind: 'recent', text, type: 'query'|'tag' }  reloj + badge 'recent' + x
 *   { kind: 'tag',    text, count }                #    + badge 'tag'
 *   { kind: 'new',    text }                       lupa + badge 'new' (último)
 *
 * La parte ESCRITA va en negrita (splitByMatch: accent/case-insensitive).
 */

const ICONS = {
  recent: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  ),
  new: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
};

// Etiquetas por tipo. Un type futuro del backend (ej: 'user') cae al
// fallback (su propio nombre como badge + ícono de lupa) hasta tener
// indicativo propio — el render nunca se rompe por un tipo nuevo.
const BADGE_LABEL = { recent: "recent", tag: "tag", new: "new" };
const badgeLabel = (kind) => BADGE_LABEL[kind] || kind;

function renderBoldMatch(text, query) {
  // El texto de los items va sin '#'; si el usuario tipeó '#aler', el match
  // en negrita debe compararse sin ese prefijo.
  const cleanQuery = (query || "").trim().replace(/^#/, "");
  if (!cleanQuery) return text;
  return splitByMatch(text, cleanQuery).map((seg, idx) =>
    seg.match ? (
      <strong key={idx} className={styles.match}>
        {seg.text}
      </strong>
    ) : (
      <React.Fragment key={idx}>{seg.text}</React.Fragment>
    )
  );
}

function SearchSuggestions({
  items,
  query,
  highlightIndex,
  onSelect,
  onRemoveRecent,
  onClearRecents,
  showClearAll,
}) {
  if (!items.length) return null;

  return (
    <div className={styles.dropdown} role="listbox">
      {items.map((item, index) => {
        const isTag = item.kind === "tag";
        // El '#' del tag lo pone SOLO el ícono de la izquierda (un único
        // lugar de presentación) — el texto va limpio. Antes el texto
        // también lo anteponía => '##nombre'.
        const display = item.text;
        const recentTag = item.kind === "recent" && item.type === "tag";
        return (
          <div
            key={`${item.kind}-${item.type || ""}-${item.text}`}
            role="option"
            aria-selected={index === highlightIndex}
            className={`${styles.item} ${
              index === highlightIndex ? styles.itemHighlighted : ""
            }`}
            // onMouseDown (no onClick): se ejecuta ANTES del blur del input,
            // que cerraría el dropdown antes de poder seleccionar.
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
          >
            <span
              className={`${styles.icon} ${isTag ? styles.iconTag : ""}`}
              aria-hidden="true"
            >
              {isTag ? "#" : ICONS[item.kind] || ICONS.new}
            </span>
            <span
              className={`${styles.text} ${
                isTag || recentTag ? styles.textTag : ""
              }`}
            >
              {item.kind === "new" ? (
                <>
                  Search for &ldquo;
                  <strong className={styles.match}>{item.text}</strong>&rdquo;
                </>
              ) : (
                renderBoldMatch(display, query)
              )}
            </span>
            {item.kind === "recent" && (
              <button
                type="button"
                className={styles.removeButton}
                aria-label={`Remove ${item.text} from recent searches`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveRecent(item);
                }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <span
              className={`${styles.badge} ${
                styles[`badge_${item.kind}`] || styles.badge_new
              }`}
            >
              {badgeLabel(item.kind)}
            </span>
          </div>
        );
      })}

      {showClearAll && (
        <button
          type="button"
          className={styles.clearAll}
          onMouseDown={(e) => {
            e.preventDefault();
            onClearRecents();
          }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/**
 * Arma la lista de sugerencias: recientes que coinciden + tags del backend
 * (sin duplicar una reciente tipo tag) + 'Search for X' SIEMPRE al final.
 * Con input vacío: solo las recientes.
 */
export function buildSuggestionItems({ query, recents, tags }) {
  const trimmed = (query || "").trim();
  const items = [];

  if (!trimmed) {
    recents.forEach((r) => items.push({ kind: "recent", ...r }));
    return items;
  }

  const lower = trimmed.replace(/^#/, "").toLowerCase();
  const matchingRecents = recents.filter((r) =>
    r.text.toLowerCase().includes(lower)
  );
  matchingRecents.forEach((r) => items.push({ kind: "recent", ...r }));

  const recentTagTexts = new Set(
    matchingRecents.filter((r) => r.type === "tag").map((r) => r.text)
  );
  tags
    .filter((t) => !recentTagTexts.has(t.name))
    // kind = el 'type' EXPLÍCITO que manda el backend (hoy siempre 'tag');
    // ya no se asume por origen. Si el backend añade tipos ('query',
    // 'user'...), fluyen hasta el render sin cambios estructurales.
    .forEach((t) =>
      items.push({ kind: t.type || "tag", text: t.name, count: t.count })
    );

  if (trimmed !== "#") {
    items.push({ kind: "new", text: trimmed });
  }
  return items;
}

export default SearchSuggestions;
