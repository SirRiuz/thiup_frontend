import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SearchSuggestions, {
  buildSuggestionItems,
} from "../search/SearchSuggestions";
import { useTagSuggestions } from "../../hooks/useTagSuggestions";
import {
  getRecent,
  addRecent,
  removeRecent,
  clearRecent,
} from "../../utils/recentSearches";
import { extractTagFromSearch } from "../../utils/hashtags";
import styles from "../../styles/components/home/HomeSearchBar.module.css";

/**
 * Search bar del home — mismo autocomplete tipo Google que /search (dropdown
 * compartido SearchSuggestions: recientes + tags reales del backend + 'Search
 * for X'). Reemplaza el HomeSearchResults mock. Escribir NO busca; la
 * búsqueda se ejecuta al seleccionar una sugerencia o Enter.
 */
function HomeSearchBar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [recents, setRecents] = useState(getRecent);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Sincroniza el field con el query de la URL cuando cambia la URL
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const handleKeydown = (e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "k") {
        e.preventDefault();
        if (inputRef.current) inputRef.current.focus();
      }
      if (e.key === "Escape" && isOpen) {
        if (inputRef.current) inputRef.current.blur();
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Sugerencias de tags reales (debounce + cancelación en el hook).
  const tagSuggestions = useTagSuggestions(isOpen ? query : "");

  const items = useMemo(
    () => buildSuggestionItems({ query, recents, tags: tagSuggestions }),
    [query, recents, tagSuggestions]
  );

  // Ejecuta la búsqueda completa (navegando a /search) y guarda la reciente.
  const executeSearch = ({ text, asTag }) => {
    if (asTag) {
      const cleanTag = text.replace(/^#/, "");
      setRecents(addRecent({ text: cleanTag, type: "tag" }));
      navigate(`/search?tag=${encodeURIComponent(cleanTag)}`);
    } else {
      setRecents(addRecent({ text, type: "query" }));
      navigate(`/search?q=${encodeURIComponent(text)}`);
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
    const value = query.trim();
    if (!value || value === "#") return;
    const tagFromHash = extractTagFromSearch(value);
    executeSearch(
      tagFromHash
        ? { text: tagFromHash, asTag: true }
        : { text: value, asTag: false }
    );
  };

  const handleFocus = () => {
    setRecents(getRecent());
    setIsOpen(true);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setHighlightIndex(-1);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e) => {
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

  const handleClearInline = (e) => {
    e.stopPropagation();
    setQuery("");
    setHighlightIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  const showClearAll =
    isOpen && !query.trim() && items.some((i) => i.kind === "recent");

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.field}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9b9591"
          strokeWidth="1.5"
          className={styles.icon}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          id="home-search-input"
          name="search"
          type="text"
          className={styles.input}
          placeholder="search posts, tags, users..."
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          aria-label="Search"
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button
            type="button"
            className={styles.clearInline}
            onClick={handleClearInline}
            aria-label="Clear search"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {!query && (
          <span className={styles.kbd} aria-hidden="true">
            ⌘K
          </span>
        )}
      </div>
      {isOpen && (
        <SearchSuggestions
          items={items}
          query={query}
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
  );
}

export default HomeSearchBar;
