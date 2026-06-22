import { createContext, useContext, useState, useEffect } from "react";
import { fetchCurrentMask } from "../api/userApi";

/**
 * Current user (their mask) — A SINGLE global request per session.
 *
 * The dedupe lives in a module-level PROMISE (not in the component's
 * lifecycle): StrictMode's double mount in dev re-subscribes to the SAME
 * promise instead of aborting/repeating the request. (The previous pattern
 * — an "already requested" ref + AbortController in the cleanup — made
 * StrictMode CANCEL the single request and never retry it.)
 *
 * Shape: currentUserMask = { id (6 chars, display/avatar), fullHash,
 * countryCode (GeoIP region — For You's regional boost) }.
 * The avatar is generated on the client with MaskAvatar from the id.
 */
const CurrentUserContext = createContext(null);

let mePromise = null;

function loadCurrentMask() {
  if (!mePromise) {
    mePromise = fetchCurrentMask().catch((err) => {
      // Failed: free the slot so a future mount can retry.
      mePromise = null;
      throw err;
    });
  }
  return mePromise;
}

export function CurrentUserProvider({ children }) {
  const [currentUserMask, setCurrentUserMask] = useState(null);
  // PRIVATE stats from /me ({ threads, reactions, replies }) — the owner's own,
  // shown only on /me. Comes free with the single /me request.
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    loadCurrentMask()
      .then((data) => {
        if (!active) return;
        const hash = data?.mask_id || "";
        setCurrentUserMask({
          id: hash.slice(0, 6), // same convention as the posts mapper
          fullHash: hash,
          // Reader's region (backend's GeoIP) — For You uses it
          // for the regional boost (?region=).
          countryCode: data?.country_code || "",
        });
        setStats(data?.stats || null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setIsLoading(false);
      });
    return () => {
      active = false; // only prevents setState after unmount — does NOT abort the fetch
    };
  }, []);

  const value = { currentUserMask, stats, isLoading, error };

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
