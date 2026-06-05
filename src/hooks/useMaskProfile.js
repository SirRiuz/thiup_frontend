import { useState, useEffect } from "react";
import { fetchMaskProfile } from "../api/userApi";

/**
 * Perfil de una máscara para el hover card, BAJO DEMANDA y con CACHÉ.
 *
 * - Bajo demanda: el hook vive dentro del hover card, que solo se monta al
 *   hacer hover (con su delay) — nunca se fetchea al renderizar las listas.
 * - Caché por hash (módulo, vive toda la sesión): la misma máscara repetida
 *   en el feed, o un segundo hover, NO repite el request ni el skeleton.
 */
const profileCache = new Map();

function mapProfile(data) {
  return {
    joinedAt: data.joined,
    postsCount: data.posts_count ?? 0,
    repliesCount: data.replies_count ?? 0,
  };
}

export function useMaskProfile(fullHash) {
  const cached = fullHash ? profileCache.get(fullHash) : null;
  const [profile, setProfile] = useState(cached || null);
  const [isLoading, setIsLoading] = useState(Boolean(fullHash) && !cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fullHash) {
      setIsLoading(false);
      return undefined;
    }
    const hit = profileCache.get(fullHash);
    if (hit) {
      setProfile(hit);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setError(null);

    fetchMaskProfile(fullHash, { signal: controller.signal })
      .then((data) => {
        const mapped = mapProfile(data);
        profileCache.set(fullHash, mapped);
        if (!active) return;
        setProfile(mapped);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active || (err && err.name === "AbortError")) return;
        setError(err);
        setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [fullHash]);

  return { profile, isLoading, error };
}
