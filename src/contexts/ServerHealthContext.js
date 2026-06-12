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
 * Global state of the server's health (Option B):
 *   (a) checks the healthcheck when the app loads, and
 *   (b) re-checks when any request to the backend fails with a 5xx or a
 *       network error (SERVER_ERROR_EVENT event emitted by apiFetch).
 *
 * RE-CHECKING on a 5xx (instead of marking down directly) avoids false
 * positives: a one-off 500 from an endpoint doesn't mean the server is
 * down — the Oops is only shown if the healthcheck also fails.
 *
 * The initial check does NOT block the app: isServerDown starts at false and
 * the Oops only appears if the check confirms the outage.
 */
const ServerHealthContext = createContext(null);

// Minimal event that apiFetch fires on a 5xx / network down (one line over
// there, zero coupling with the encryption logic).
export const SERVER_ERROR_EVENT = "thiup:server-error";

export function ServerHealthProvider({ children }) {
  const [isServerDown, setIsServerDown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  // Avoids concurrent checks (several 5xx in a row, double-click on retry).
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

  // (a) Check when the app loads.
  useEffect(() => {
    verify();
  }, [verify]);

  // (b) Any 5xx/network down reported by apiFetch => re-check.
  useEffect(() => {
    const onServerError = () => verify();
    window.addEventListener(SERVER_ERROR_EVENT, onServerError);
    return () => window.removeEventListener(SERVER_ERROR_EVENT, onServerError);
  }, [verify]);

  const value = {
    isServerDown,
    isChecking,
    // 'Try again': re-checks the healthcheck; if it returns 200, isServerDown
    // turns to false and the app is shown WITHOUT reloading the page.
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

/** Renders `fallback` (the Oops screen) when the server is down. */
export function ServerHealthGate({ fallback, children }) {
  const { isServerDown } = useServerHealth();
  return isServerDown ? fallback : children;
}
