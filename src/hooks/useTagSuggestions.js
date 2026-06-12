import { useState, useEffect, useRef } from "react";
import { fetchSuggestions } from "../api/searchApi";

const DEBOUNCE_MS = 250;

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
 * Devuelve { trending, tags, threads } (siempre arrays).
 */
export function useTagSuggestions(query) {
  const [data, setData] = useState({ trending: [], tags: [], threads: [] });
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    const trimmed = (query || "").trim().replace(/^#/, "");
    const key = trimmed.toLowerCase();

    // Caché por prefijo (incluye "" para las tendencias).
    const cached = cacheRef.current.get(key);
    if (cached) {
      requestIdRef.current += 1;
      setData(cached);
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

    const timer = setTimeout(() => {
      fetchSuggestions(trimmed, { signal: controller.signal })
        .then((res) => {
          if (requestId !== requestIdRef.current) return;
          const next = {
            trending: res?.trending || [],
            tags: res?.tags || [],
            threads: res?.threads || [],
          };
          cacheRef.current.set(key, next);
          setData(next);
        })
        .catch(() => {
          /* abort / red: conservamos las sugerencias previas */
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return data;
}
