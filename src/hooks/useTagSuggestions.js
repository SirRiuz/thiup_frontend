import { useState, useEffect, useRef } from "react";
import { fetchTagSuggestions } from "../api/searchApi";

const DEBOUNCE_MS = 180;

/**
 * Sugerencias de tags para el autocomplete.
 *
 * - DEBOUNCE (~180ms): no se pide en cada tecla.
 * - Cancelación: AbortController + requestId — si el usuario sigue tecleando
 *   se cancela el request anterior y solo la respuesta más reciente escribe
 *   state (sin respuestas desordenadas).
 */
export function useTagSuggestions(query) {
  const [tags, setTags] = useState([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = (query || "").trim().replace(/^#/, "");
    if (!trimmed) {
      requestIdRef.current += 1;
      setTags([]);
      return undefined;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetchTagSuggestions(trimmed, { signal: controller.signal })
        .then((data) => {
          if (requestId !== requestIdRef.current) return;
          setTags(data?.results || []);
        })
        .catch(() => {
          /* abort o error de red: conservamos las sugerencias previas */
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return tags;
}
