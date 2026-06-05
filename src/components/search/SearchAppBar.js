import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
import { formatCompactNumber } from "../../utils/formatNumber";
import styles from "../../styles/components/search/SearchAppBar.module.css";

/**
 * App bar de /search — autocomplete tipo Google (keywords, NO resultados):
 *
 *   - Escribir NO ejecuta la búsqueda completa (se quitó el auto-search por
 *     tecla). Solo muestra SUGERENCIAS: recientes (localStorage, filtrado
 *     instantáneo) + tags del backend (debounce + cancelación) + 'Search
 *     for X' al final.
 *   - Input vacío → recientes (reloj + x + Clear all).
 *   - La búsqueda completa solo corre al SELECCIONAR una sugerencia o Enter
 *     ('#peru' al inicio => modo tag; si no => query). Al ejecutar se guarda
 *     en recientes.
 *   - ← sale (navigate(-1) con fallback); × limpia el texto sin salir.
 */
function SearchAppBar({ mode, query, tag, totalResults, showCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);

  // Lo que la URL dicta para el input (el modo tag se muestra como #tag).
  const urlValue = mode === "tag" ? `#${tag}` : query;

  const [inputValue, setInputValue] = useState(urlValue);
  const [isOpen, setIsOpen] = useState(false);
  const [recents, setRecents] = useState(getRecent);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Última escritura propia a la URL: los cambios externos (back/forward,
  // click en un tag de los resultados) SÍ sincronizan el input.
  const lastPushedRef = useRef(urlValue);

  useEffect(() => {
    if (urlValue === lastPushedRef.current) return;
    lastPushedRef.current = urlValue;
    setInputValue(urlValue);
  }, [urlValue]);

  // Sugerencias de tags del backend (debounce 180ms + cancelación interna).
  const tagSuggestions = useTagSuggestions(isOpen ? inputValue : "");

  const items = useMemo(
    () =>
      buildSuggestionItems({
        query: inputValue,
        recents,
        tags: tagSuggestions,
      }),
    [inputValue, recents, tagSuggestions]
  );

  // Ejecuta la búsqueda COMPLETA (única vía: selección o Enter) y la guarda
  // en recientes. Reusa los flujos existentes: ?tag= (modo tag) / ?q=.
  const executeSearch = ({ text, asTag }) => {
    if (asTag) {
      const cleanTag = text.replace(/^#/, "");
      setRecents(addRecent({ text: cleanTag, type: "tag" }));
      lastPushedRef.current = `#${cleanTag}`;
      setInputValue(`#${cleanTag}`);
      setSearchParams({ tag: cleanTag });
    } else {
      setRecents(addRecent({ text, type: "query" }));
      lastPushedRef.current = text;
      setInputValue(text);
      setSearchParams({ q: text });
    }
    setIsOpen(false);
    setHighlightIndex(-1);
    if (inputRef.current) inputRef.current.blur();
  };

  const handleSelectItem = (item) => {
    const asTag =
      item.kind === "tag" || (item.kind === "recent" && item.type === "tag");
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
    // location.key === "default" => primera entrada del historial (deep
    // link): no hay "atrás" real, caemos al home.
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/home");
    }
  };

  // × limpia el TEXTO (las recientes aparecen en el dropdown); NO sale ni
  // toca la URL — la búsqueda mostrada solo cambia al ejecutar otra.
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
            aria-label="Back"
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
                  // El dropdown usa onMouseDown+preventDefault, así que un
                  // click en una sugerencia NO dispara este blur.
                  setIsOpen(false);
                  setHighlightIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search Thiup"
                aria-label="Search"
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
                  aria-label="Clear search text"
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

        {showCount && (
          <p className={styles.count}>
            {formatCompactNumber(totalResults)}{" "}
            {totalResults === 1 ? "result" : "results"}
          </p>
        )}
      </div>
    </header>
  );
}

export default SearchAppBar;
