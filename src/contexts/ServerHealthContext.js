import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { checkServerHealth } from "../api/healthApi";

/**
 * Estado global del health del servidor (Opción B):
 *   (a) verifica el healthcheck al cargar la app, y
 *   (b) re-verifica cuando cualquier request al backend falla con 5xx o con
 *       error de red (evento SERVER_ERROR_EVENT emitido por apiFetch).
 *
 * Re-VERIFICAR ante un 5xx (en vez de marcar down directo) evita falsos
 * positivos: un 500 puntual de un endpoint no significa que el servidor
 * esté caído — solo si el healthcheck también falla se muestra el Oops.
 *
 * La verificación inicial NO bloquea la app: isServerDown arranca en false y
 * el Oops solo aparece si el check confirma la caída.
 */
const ServerHealthContext = createContext(null);

// Evento mínimo que apiFetch dispara ante 5xx / red caída (una línea allá,
// cero acoplamiento con la lógica de cifrado).
export const SERVER_ERROR_EVENT = "thiup:server-error";

export function ServerHealthProvider({ children }) {
  const [isServerDown, setIsServerDown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  // Evita checks concurrentes (varios 5xx seguidos, doble click en retry).
  const inFlightRef = useRef(false);

  const verify = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsChecking(true);
    const healthy = await checkServerHealth();
    setIsServerDown(!healthy);
    setIsChecking(false);
    inFlightRef.current = false;
  }, []);

  // (a) Verificación al cargar la app.
  useEffect(() => {
    verify();
  }, [verify]);

  // (b) Cualquier 5xx/red caída reportado por apiFetch => re-verificar.
  useEffect(() => {
    const onServerError = () => verify();
    window.addEventListener(SERVER_ERROR_EVENT, onServerError);
    return () => window.removeEventListener(SERVER_ERROR_EVENT, onServerError);
  }, [verify]);

  const value = {
    isServerDown,
    isChecking,
    // 'Try again': re-verifica el healthcheck; si vuelve 200, isServerDown
    // pasa a false y la app se muestra SIN recargar la página.
    retry: verify,
  };

  return (
    <ServerHealthContext.Provider value={value}>
      {children}
    </ServerHealthContext.Provider>
  );
}

export function useServerHealth() {
  const ctx = useContext(ServerHealthContext);
  if (!ctx) {
    throw new Error(
      "useServerHealth must be used within a ServerHealthProvider"
    );
  }
  return ctx;
}

/** Renderiza `fallback` (la pantalla Oops) cuando el servidor está caído. */
export function ServerHealthGate({ fallback, children }) {
  const { isServerDown } = useServerHealth();
  return isServerDown ? fallback : children;
}
