import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  fetchNotifications,
  fetchNotificationsPage,
  fetchUnreadCount,
  markNotificationsRead,
} from "../api/notificationApi";

/**
 * Notifications inbox + unread badge — polled, not pushed (no WS/SSE in
 * this stack). unreadCount is polled on an interval, paused while the tab
 * is hidden (mirrors the visibility-awareness in screens/Post.js's dwell
 * tracking, but start/stop instead of accumulate).
 */
const NotificationsContext = createContext(null);

const POLL_INTERVAL_MS = 30000;

// Module-level in-flight dedup — same idiom as CurrentUserContext's
// mePromise. StrictMode double-invokes the mount effect in dev (mount →
// cleanup → mount again), and the effect body fires an immediate poll on
// EACH invocation; without this, that's two real network requests on every
// page load instead of one. A later, genuinely separate poll (the next
// interval tick, or a visibility-change poll after the first settled) still
// fires normally once inFlightPoll resets to null.
let inFlightPoll = null;

function pollUnreadCountOnce() {
  if (!inFlightPoll) {
    inFlightPoll = fetchUnreadCount().finally(() => {
      inFlightPoll = null;
    });
  }
  return inFlightPoll;
}

// Same dedup for the notifications SCREEN's own mount effect
// (loadFirstPage + markAllRead) — Notifications.js remounts on every visit
// to /notifications, and StrictMode double-invokes THAT mount too, so
// without this a single visit fires 2x GET /notifications/ and 2x POST
// /notifications/mark-read/. Both calls are idempotent (a GET, and a bulk
// is_read=False→True update that's a no-op the 2nd time), so collapsing
// concurrent duplicates into one shared request is always safe.
let inFlightFirstPage = null;

function loadFirstPageOnce() {
  if (!inFlightFirstPage) {
    inFlightFirstPage = fetchNotifications().finally(() => {
      inFlightFirstPage = null;
    });
  }
  return inFlightFirstPage;
}

let inFlightMarkRead = null;

function markAllReadOnce() {
  if (!inFlightMarkRead) {
    inFlightMarkRead = markNotificationsRead().finally(() => {
      inFlightMarkRead = null;
    });
  }
  return inFlightMarkRead;
}

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [nextUrl, setNextUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const pollTimerRef = useRef(null);

  const pollUnreadCount = useCallback(() => {
    if (document.hidden) return;
    pollUnreadCountOnce()
      .then((data) => setUnreadCount(data?.unread_count || 0))
      .catch(() => {
        /* transient poll failure: try again next tick */
      });
  }, []);

  useEffect(() => {
    pollUnreadCount();
    pollTimerRef.current = setInterval(pollUnreadCount, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (!document.hidden) pollUnreadCount();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(pollTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pollUnreadCount]);

  // Returns the fetched rows to the caller (not just void) — the screen
  // needs a stable snapshot of what was ACTUALLY unread on the wire, taken
  // before markAllRead's own optimistic flip (and its POST, which races
  // against this GET server-side) touches anything. See Notifications.js.
  const loadFirstPage = useCallback(() => {
    setIsLoading(true);
    return loadFirstPageOnce()
      .then((data) => {
        const results = data?.results || [];
        setNotifications(results);
        setNextUrl(data?.next || null);
        return results;
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loadMore = useCallback(() => {
    if (!nextUrl || isLoading) return Promise.resolve();
    setIsLoading(true);
    return fetchNotificationsPage(nextUrl)
      .then((data) => {
        setNotifications((prev) => [...prev, ...(data?.results || [])]);
        setNextUrl(data?.next || null);
      })
      .finally(() => setIsLoading(false));
  }, [nextUrl, isLoading]);

  // markAllRead is optimistic (zeroes the badge immediately, like the FE
  // renders reactions optimistically) — the backend call is fire-and-forget
  // from the caller's point of view, but we roll back on failure so the
  // badge doesn't lie if the request never landed.
  const markAllRead = useCallback(() => {
    const previousCount = unreadCount;
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    markAllReadOnce().catch(() => setUnreadCount(previousCount));
  }, [unreadCount]);

  const value = {
    unreadCount,
    notifications,
    hasMore: Boolean(nextUrl),
    isLoading,
    loadFirstPage,
    loadMore,
    markAllRead,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return ctx;
}
