/**
 * Backend call for batched engagement telemetry (foundation of the future
 * analytics system), via apiFetch (E2E encryption intact).
 *
 *   POST /batch/ { events: [{ target_type, target_uid, type, count }] }
 *
 * Fire-and-forget: no @human_validator on the backend, and callers here
 * never await the result to block UI — see src/utils/engagementQueue.js,
 * the only caller.
 */
import { apiFetch } from "./client";

const BATCH_ENDPOINT = "/batch/";

/**
 * @param {Array<{target_type: string, target_uid: string, type: string, count: number}>} events
 * @param {{keepalive?: boolean}} [options]
 *   keepalive = true survives a tab-hide/close flush (fetch keepalive).
 */
export function sendEngagementBatch(events, { keepalive = false } = {}) {
  return apiFetch(BATCH_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ events }),
    keepalive,
  });
}
