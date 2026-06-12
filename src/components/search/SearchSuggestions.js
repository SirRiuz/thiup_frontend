import React from "react";
import { useTranslation } from "react-i18next";
import { splitByMatch } from "../../utils/matchText";
import styles from "../../styles/components/search/SearchSuggestions.module.css";

/**
 * Autocomplete dropdown (Google-style, keywords — not full results).
 *
 * Items (assembled by the parent with buildSuggestionItems):
 *   { kind: 'recent', text, type: 'query'|'tag' }  clock + 'recent' badge + x
 *   { kind: 'tag',    text, count }                #     + 'tag' badge
 *   { kind: 'new',    text }                       magnifier + 'new' badge (last)
 *
 * The TYPED part is bold (splitByMatch: accent/case-insensitive).
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
  thread: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
};

// Label keys by type. A future backend type (e.g. 'user') falls to the
// fallback (its own name as badge + magnifier icon) until it has its own
// indicator — the render never breaks because of a new type.
const BADGE_LABEL_KEYS = {
  recent: "search.badgeRecent",
  tag: "search.badgeTag",
  trending: "search.badgeTrending",
  thread: "search.badgePost",
  new: "search.badgeNew",
};

function renderBoldMatch(text, query) {
  // The items' text comes without '#'; if the user typed '#aler', the bold
  // match must be compared without that prefix.
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
  const { t } = useTranslation();
  // Badge label: translated key if the type is known; otherwise the kind
  // itself as fallback (a new backend type never breaks).
  const badgeLabel = (kind) =>
    BADGE_LABEL_KEYS[kind] ? t(BADGE_LABEL_KEYS[kind]) : kind;
  if (!items.length) return null;

  return (
    <div className={styles.dropdown} role="listbox">
      {items.map((item, index) => {
        const isTag = item.kind === "tag" || item.kind === "trending";
        // The tag's '#' is added ONLY by the left icon (a single
        // presentation place) — the text comes clean. Previously the text
        // also prepended it => '##name'.
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
            // onMouseDown (not onClick): runs BEFORE the input's blur, which
            // would close the dropdown before being able to select.
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
                  {t("search.searchForLead")} &ldquo;
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
                aria-label={t("search.removeRecent", { text: item.text })}
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
          {t("search.clearAll")}
        </button>
      )}
    </div>
  );
}

/**
 * Assembles the suggestion list: matching recents + backend tags (without
 * duplicating a recent of type tag) + 'Search for X' ALWAYS at the end.
 * With empty input: only the recents.
 */
export function buildSuggestionItems({ query, recents, suggestions }) {
  const trimmed = (query || "").trim();
  const { trending = [], tags = [], threads = [] } = suggestions || {};
  const items = [];

  // Input vacío → RECIENTES (local) + TENDENCIAS (tags con más momentum).
  if (!trimmed) {
    recents.forEach((r) => items.push({ kind: "recent", ...r }));
    const recentTexts = new Set(recents.map((r) => r.text.toLowerCase()));
    trending
      .filter((t) => !recentTexts.has(t.name.toLowerCase()))
      .forEach((t) =>
        items.push({ kind: "trending", text: t.name, count: t.count })
      );
    return items;
  }

  const lower = trimmed.replace(/^#/, "").toLowerCase();
  const matchingRecents = recents.filter((r) =>
    r.text.toLowerCase().includes(lower)
  );
  matchingRecents.forEach((r) => items.push({ kind: "recent", ...r }));

  // TAGS por prefijo (ordenados por tendencia), sin duplicar recientes.
  const recentTagTexts = new Set(
    matchingRecents.filter((r) => r.type === "tag").map((r) => r.text)
  );
  tags
    .filter((t) => !recentTagTexts.has(t.name))
    .forEach((t) =>
      items.push({ kind: "tag", text: t.name, count: t.count })
    );

  // HILOS que coinciden en su CONTENIDO (snippet → navega al hilo).
  threads.forEach((th) =>
    items.push({ kind: "thread", text: th.snippet, uid: th.uid })
  );

  if (trimmed !== "#") {
    items.push({ kind: "new", text: trimmed });
  }
  return items;
}

export default SearchSuggestions;
