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

// apiFetch fires SERVER_ERROR_EVENT when the server RESPONDS with a 5xx (there
// WAS an HTTP response) and NETWORK_ERROR_EVENT when the request failed WITHOUT
// a response (offline / unreachable). Splitting them lets us show the right
// screen: server-down vs no-connection.
export const SERVER_ERROR_EVENT = "thiup:server-error";
export const NETWORK_ERROR_EVENT = "thiup:network-error";

const isBrowserOffline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;

export function ServerHealthProvider({ children }) {
  const [isServerDown, setIsServerDown] = useState(false);
  // Client has no internet (or a request failed without any HTTP response).
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  // Avoids concurrent checks (several 5xx in a row, double-click on retry).
  const inFlightRef = useRef(false);

  const verify = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsChecking(true);
    const healthy = await checkServerHealth();
    if (healthy) {
      // Recovered: clear both screens without reloading the page.
      setIsServerDown(false);
      setIsOffline(false);
    } else if (isBrowserOffline()) {
      // The browser reports no connection → NETWORK problem, not the server.
      setIsOffline(true);
      setIsServerDown(false);
    } else {
      // A failure while the browser is online → the SERVER is down.
      setIsServerDown(true);
      setIsOffline(false);
    }
    setIsChecking(false);
    inFlightRef.current = false;
  }, []);

  // (a) Check when the app loads.
  useEffect(() => {
    verify();
  }, [verify]);

  // (b) A 5xx reported by apiFetch (the server DID respond) => re-check the
  // healthcheck (a one-off 500 doesn't mean the server is down).
  useEffect(() => {
    const onServerError = () => verify();
    window.addEventListener(SERVER_ERROR_EVENT, onServerError);
    return () => window.removeEventListener(SERVER_ERROR_EVENT, onServerError);
  }, [verify]);

  // (c) A request that failed WITHOUT a response (apiFetch network error). If
  // the browser is offline it's unambiguously a NETWORK problem → show it
  // immediately (the healthcheck would fail too). If "online" but the request
  // still failed, let the healthcheck classify (server down vs flaky network).
  useEffect(() => {
    const onNetworkError = () => {
      if (isBrowserOffline()) setIsOffline(true);
      else verify();
    };
    window.addEventListener(NETWORK_ERROR_EVENT, onNetworkError);
    return () =>
      window.removeEventListener(NETWORK_ERROR_EVENT, onNetworkError);
  }, [verify]);

  // (d) Auto-recovery via the browser's connectivity events: 'online' →
  // re-check and clear the screen if healthy; 'offline' → show it at once.
  // Listeners cleaned up on unmount (no leaks / phantom calls).
  useEffect(() => {
    const onOnline = () => verify();
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [verify]);

  const value = {
    isServerDown,
    isOffline,
    isChecking,
    // 'Try again' (both screens): re-checks the healthcheck and reclassifies;
    // if it returns 200 the app is shown again WITHOUT reloading the page.
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

/**
 * Renders the right screen: `offlineFallback` (no connection) takes precedence
 * — if the client has no internet, that's the actionable problem — then
 * `fallback` (server down), otherwise the app.
 */
export function ServerHealthGate({ fallback, offlineFallback, children }) {
  const { isServerDown, isOffline } = useServerHealth();
  if (isOffline) return offlineFallback ?? fallback ?? children;
  if (isServerDown) return fallback ?? children;
  return children;
}
