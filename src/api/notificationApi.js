/**
 * Backend calls for the notifications inbox, via apiFetch (E2E encryption
 * intact).
 *
 *   GET  /notifications/               → paginated inbox, grouped at read
 *   GET  /notifications/unread-count/  → { unread_count }
 *   POST /notifications/mark-read/     → { status: "ok" }
 *   POST /notifications/dismiss/       → { status: "ok", deleted: N }
 */
import { apiFetch } from "./client";

const NOTIFICATIONS_ENDPOINT = "/notifications/";

export function fetchNotifications({ signal } = {}) {
  return apiFetch(`${NOTIFICATIONS_ENDPOINT}?_t=${Date.now()}`, { signal });
}

// Pagination advances via the backend's own `next` URL (apiFetch accepts an
// absolute URL directly) — no page-number bookkeeping on the client.
export function fetchNotificationsPage(url, { signal } = {}) {
  return apiFetch(url, { signal });
}

export function fetchUnreadCount({ signal } = {}) {
  return apiFetch(`${NOTIFICATIONS_ENDPOINT}unread-count/?_t=${Date.now()}`, {
    signal,
  });
}

export function markNotificationsRead() {
  return apiFetch(`${NOTIFICATIONS_ENDPOINT}mark-read/`, { method: "POST" });
}

// Identifies the GROUPED row (thread uid + verb), not a single backend
// row's internal id — dismissing a group removes every Notification it
// collapsed, mirroring how group_notifications built it server-side.
export function dismissNotification({ threadUid, verb }) {
  return apiFetch(`${NOTIFICATIONS_ENDPOINT}dismiss/`, {
    method: "POST",
    body: JSON.stringify({ thread_uid: threadUid, verb }),
  });
}
