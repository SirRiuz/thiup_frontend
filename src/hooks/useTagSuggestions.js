import { useState, useEffect, useRef } from "react";
import { fetchSuggestions } from "../api/searchApi";

const DEBOUNCE_MS = 250;

// SESSION cache, at MODULE level (same pattern as ThreadCacheContext): it
// survives unmounts, so leaving and re-entering /search does NOT re-request
// the trending (or any already-typed prefix). FIFO cap so a long typing
// session can't grow it unbounded.
const MAX_CACHED_PREFIXES = 50;
const suggestionCache = new Map();

function cacheSet(key, value) {
  if (!suggestionCache.has(key) && suggestionCache.size >= MAX_CACHED_PREFIXES) {
    suggestionCache.delete(suggestionCache.keys().next().value);
  }
  suggestionCache.set(key, value);
}

/**
 * Autocomplete suggestions (estilo Twitter):
 *   input vacío → { trending: [...] } (tags con más momentum, precomputado)
 *   ≥2 chars    → { tags: [...], threads: [{uid, snippet}...] }
 *
 * - DEBOUNCE 250ms: no se pide por cada tecla.
 * - Cancelación: AbortController + requestId — solo la respuesta más
 *   reciente escribe state (sin respuestas fuera de orden).
 * - CACHÉ por prefijo en memoria (vida del componente): si vuelves a un
 *   prefijo ya visto (incluido "" para tendencias), no se re-pide.
 *
 * Devuelve { trending, tags, threads, isLoading } (siempre arrays; isLoading
 * es true solo mientras hay un fetch en vuelo SIN caché para el prefijo —
 * los skeletons de la landing lo consumen).
 */
export function useTagSuggestions(query) {
  // Lazy init from the session cache: a re-mounted /search paints the cached
  // trending on the FIRST render, without a loading flash.
  const [data, setData] = useState(
    () =>
      suggestionCache.get((query || "").trim().replace(/^#/, "").toLowerCase()) || {
        trending: [],
        tags: [],
        threads: [],
      }
  );
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = (query || "").trim().replace(/^#/, "");
    const key = trimmed.toLowerCase();

    // Caché por prefijo (incluye "" para las tendencias) — de SESIÓN.
    const cached = suggestionCache.get(key);
    if (cached) {
      requestIdRef.current += 1;
      setData(cached);
      setIsLoading(false);
      return undefined;
    }

    // 1 char: el backend pide ≥2 — no disparamos; conservamos lo previo
    // (las tendencias siguen visibles hasta tener un prefijo útil).
    if (trimmed.length === 1) {
      return undefined;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();
    setIsLoading(true);

    const timer = setTimeout(() => {
      fetchSuggestions(trimmed, { signal: controller.signal })
        .then((res) => {
          if (requestId !== requestIdRef.current) return;
          const next = {
            trending: res?.trending || [],
            tags: res?.tags || [],
            threads: res?.threads || [],
          };
          cacheSet(key, next);
          setData(next);
          setIsLoading(false);
        })
        .catch(() => {
          /* abort / red: conservamos las sugerencias previas */
          if (requestId === requestIdRef.current) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { ...data, isLoading };
}
