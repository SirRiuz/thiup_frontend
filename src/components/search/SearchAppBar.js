import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SearchSuggestions, {
  buildSuggestionItems,
} from "./SearchSuggestions";
import { useTagSuggestions } from "../../hooks/useTagSuggestions";
import {
  getRecent,
  addRecent,
  removeRecent,
  clearRecent,
} from "../../utils/recentSearches";
import { extractTagFromSearch } from "../../utils/hashtags";
import { sanitizeQuery, MAX_QUERY_LENGTH } from "../../utils/searchQuery";
import styles from "../../styles/components/search/SearchAppBar.module.css";

/**
 * App bar for /search — Google-style autocomplete (keywords, NOT results):
 *
 *   - Typing does NOT run the full search (the per-keystroke auto-search was
 *     removed). It only shows SUGGESTIONS: recents (localStorage, instant
 *     filtering) + backend tags (debounce + cancellation) + 'Search for X'
 *     at the end.
 *   - Empty input → recents (clock + x + Clear all).
 *   - The full search only runs when SELECTING a suggestion or Enter. A '#peru'
 *     at the start is just a normal search for '#peru' (a hashtag is a search
 *     like any other — no special mode). On execution it is saved to recents.
 *   - ← exits (navigate(-1) with fallback); × clears the text without exiting.
 */
function SearchAppBar({ mode, query }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);

  // What the URL dictates for the input.
  const urlValue = query;

  const [inputValue, setInputValue] = useState(urlValue);
  const [isOpen, setIsOpen] = useState(false);
  const [recents, setRecents] = useState(getRecent);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Last own write to the URL: external changes (back/forward, click on a
  // tag in the results) DO sync the input.
  const lastPushedRef = useRef(urlValue);

  useEffect(() => {
    if (urlValue === lastPushedRef.current) return;
    lastPushedRef.current = urlValue;
    setInputValue(urlValue);
  }, [urlValue]);

  // Entry point (/search with no query/tag): focus the input on arrival so the
  // user can type right away and the recents/suggestions open. Deep links with
  // ?q=/?tag= are NOT auto-focused — their results stay scrollable.
  useEffect(() => {
    if (mode === "none" && inputRef.current) {
      inputRef.current.focus();
    }
    // Only on mount (arrival); deps intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backend tag suggestions (debounce 180ms + internal cancellation).
  const tagSuggestions = useTagSuggestions(isOpen ? inputValue : "");

  const items = useMemo(
    () =>
      buildSuggestionItems({
        query: inputValue,
        recents,
        suggestions: tagSuggestions,
      }),
    [inputValue, recents, tagSuggestions]
  );

  // Runs the FULL search (only way: selection or Enter) and saves it to
  // recents. Everything routes to ?q= — a hashtag search is just q='#tag'.
  // The active ?tab= is PRESERVED (functional update, not a full replace): a
  // new search stays on the tab you were on (all four tabs are valid for any
  // query). With no prior ?tab=, the screen defaults to 'top'.
  const executeSearch = ({ text, asTag }) => {
    // Saneo (trim + truncado a MAX): el FE nunca manda un query inválido,
    // venga del input, de un reciente de localStorage o de un hashtag.
    text = sanitizeQuery(text);
    if (!text || text === "#") return;
    // 'asTag' only affects the recents badge + how it's re-run (with the '#').
    const queryText = asTag ? `#${text.replace(/^#/, "")}` : text;
    setRecents(
      addRecent({
        text: asTag ? text.replace(/^#/, "") : text,
        type: asTag ? "tag" : "query",
      })
    );
    lastPushedRef.current = queryText;
    setInputValue(queryText);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("q", queryText);
      return next; // keeps ?tab= (and any other param)
    });
    setIsOpen(false);
    setHighlightIndex(-1);
    if (inputRef.current) inputRef.current.blur();
  };

  const handleSelectItem = (item) => {
    // Sugerencia de HILO: navega directo a ese hilo (no es una búsqueda).
    if (item.kind === "thread" && item.uid) {
      setIsOpen(false);
      setHighlightIndex(-1);
      if (inputRef.current) inputRef.current.blur();
      navigate(`/post/${item.uid}`);
      return;
    }
    // tag/trending → búsqueda por tag; recent/new → búsqueda normal.
    const asTag =
      item.kind === "tag" ||
      item.kind === "trending" ||
      (item.kind === "recent" && item.type === "tag");
    executeSearch({ text: item.text, asTag });
  };

  const handleSubmitRaw = () => {
    const value = inputValue.trim();
    if (!value || value === "#") return;
    const tagFromHash = extractTagFromSearch(value);
    executeSearch(
      tagFromHash ? { text: tagFromHash, asTag: true } : { text: value, asTag: false }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      setIsOpen(true);
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setHighlightIndex((prev) => {
        const next = prev + delta;
        if (next < -1) return items.length - 1;
        if (next >= items.length) return -1;
        return next;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && items[highlightIndex]) {
        handleSelectItem(items[highlightIndex]);
      } else {
        handleSubmitRaw();
      }
    }
  };

  const handleBack = () => {
    // location.key === "default" => first history entry (deep link): there's
    // no real "back", we fall to the home.
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/home");
    }
  };

  // × clears the TEXT (recents appear in the dropdown); does NOT exit or
  // touch the URL — the shown search only changes when running another.
  const handleClearText = () => {
    setInputValue("");
    setHighlightIndex(-1);
    setIsOpen(true);
    if (inputRef.current) inputRef.current.focus();
  };

  const showClearAll =
    isOpen && !inputValue.trim() && items.some((i) => i.kind === "recent");

  return (
    <header className={styles.appBar}>
      <div className={styles.inner}>
        <div className={styles.row}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label={t("common.back")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <div className={styles.pillWrap}>
            <div className={styles.pill}>
              <svg
                className={styles.magnifier}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                id="search-input"
                name="search"
                className={styles.input}
                type="text"
                maxLength={MAX_QUERY_LENGTH}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setHighlightIndex(-1);
                  setIsOpen(true);
                }}
                onFocus={() => {
                  setRecents(getRecent());
                  setIsOpen(true);
                }}
                onBlur={() => {
                  // The dropdown uses onMouseDown+preventDefault, so a click
                  // on a suggestion does NOT trigger this blur.
                  setIsOpen(false);
                  setHighlightIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("search.placeholder")}
                aria-label={t("search.label")}
                autoComplete="off"
                spellCheck="false"
              />
              {inputValue && (
                <button
                  type="button"
                  className={styles.clearX}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleClearText();
                  }}
                  aria-label={t("search.clearText")}
                >
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {isOpen && (
              <SearchSuggestions
                items={items}
                query={inputValue}
                highlightIndex={highlightIndex}
                onSelect={handleSelectItem}
                onRemoveRecent={(item) =>
                  setRecents(removeRecent({ text: item.text, type: item.type }))
                }
                onClearRecents={() => setRecents(clearRecent())}
                showClearAll={showClearAll}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default SearchAppBar;
