/**
 * Client-side accumulator for passive engagement telemetry (profile views,
 * QR generations, downloads, shares) — foundation of the future analytics
 * system. Distinct from src/utils/affinity.js's tag profile: THIS data is
 * meant to reach the backend (see app/rest/batch.py), just batched and
 * pre-aggregated so a well-behaved session never fires more than a
 * handful of requests.
 *
 * track() only ever touches an in-memory Map — no network call. A flush
 * fires on two triggers, both gated on the map being non-empty:
 *   - a periodic interval (FLUSH_INTERVAL_MS)
 *   - the tab going hidden (visibilitychange), via fetch keepalive so the
 *     request survives the tab closing (see api/client.js's `keepalive`
 *     plumbing — navigator.sendBeacon can't carry the custom auth headers
 *     this app's writes require).
 *
 * Module-level, registered once at import time: the queue must survive
 * route changes (a QR download on /p/:id shouldn't lose its queued event
 * on navigating away before the next tick).
 */
import { sendEngagementBatch } from "../api/batchApi";

const FLUSH_INTERVAL_MS = 75000;

// Keyed by `${targetType}:${targetUid}:${type}` → summed count.
const queue = new Map();

export function track(targetType, targetUid, type, count = 1) {
  const key = `${targetType}:${targetUid}:${type}`;
  queue.set(key, (queue.get(key) || 0) + count);
}

export function flush({ keepalive = false } = {}) {
  if (queue.size === 0) return;

  const events = [];
  for (const [key, count] of queue.entries()) {
    const [target_type, target_uid, type] = key.split(":");
    events.push({ target_type, target_uid, type, count });
  }
  queue.clear();

  // Best-effort: on failure we do NOT re-queue. Matches the backend's
  // accepted approximate-stats stance (target existence isn't even
  // validated on write) — engineering retry reliability here would protect
  // a guarantee the design never made.
  sendEngagementBatch(events, { keepalive }).catch(() => {});
}

if (typeof document !== "undefined") {
  setInterval(() => flush({ keepalive: false }), FLUSH_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flush({ keepalive: true });
  });
}
