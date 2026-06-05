import { createContext, useContext, useState, useEffect } from "react";
import { fetchCurrentMask } from "../api/userApi";

/**
 * Usuario actual (su máscara) — UN SOLO request global por sesión.
 *
 * El dedupe vive en una PROMESA a nivel de módulo (no en el ciclo de vida
 * del componente): el doble montaje de StrictMode en dev re-suscribe a la
 * MISMA promesa en vez de abortar/repetir el request. (El patrón anterior
 * — ref de "ya pedido" + AbortController en el cleanup — hacía que
 * StrictMode CANCELARA el único request y nunca lo reintentara.)
 *
 * Shape: currentUserMask = { id (6 chars, display/avatar), fullHash,
 * countryCode (región GeoIP — boost regional del For You) }.
 * El avatar se genera en el cliente con MaskAvatar a partir del id.
 */
const CurrentUserContext = createContext(null);

let mePromise = null;

function loadCurrentMask() {
  if (!mePromise) {
    mePromise = fetchCurrentMask().catch((err) => {
      // Falló: liberar el slot para que un próximo montaje pueda reintentar.
      mePromise = null;
      throw err;
    });
  }
  return mePromise;
}

export function CurrentUserProvider({ children }) {
  const [currentUserMask, setCurrentUserMask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    loadCurrentMask()
      .then((data) => {
        if (!active) return;
        const hash = data?.mask_id || "";
        setCurrentUserMask({
          id: hash.slice(0, 6), // misma convención que el mapper de posts
          fullHash: hash,
          // Región del lector (GeoIP del backend) — el For You la usa
          // para el boost regional (?region=).
          countryCode: data?.country_code || "",
        });
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setIsLoading(false);
      });
    return () => {
      active = false; // solo evita setState tras unmount — NO aborta el fetch
    };
  }, []);

  const value = { currentUserMask, isLoading, error };

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return ctx;
}
