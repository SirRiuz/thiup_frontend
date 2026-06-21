/**
 * Backend call for thread reports, via apiFetch (E2E encryption intact).
 *
 *   POST /reports/ { thread_id, category, reason? }
 *
 * Upsert: the backend keys the report by (thread, reporter) where `reporter`
 * is the request's pseudonymous mask — derived server-side. The frontend NEVER
 * sends who is reporting (anonymity). Re-reporting the same thread updates the
 * existing report instead of duplicating it.
 */
import { apiFetch } from "./client";

const REPORTS_ENDPOINT = "/reports/";

/**
 * Creates or updates a report for a thread.
 *
 * @param {{ threadId: string, category: string, reason?: string, signal?: AbortSignal }} params
 *   category = one of the backend's choices (spam_or_deception, harassment,
 *   hate_speech, dangerous_or_self_harm, minors, other).
 *   signal   = AbortSignal to cancel the request (e.g. the sheet is closed).
 * @returns {Promise<object>} The backend's minimal response ({ status: "ok" }).
 */
export function createReport({ threadId, category, reason = "", signal }) {
  return apiFetch(REPORTS_ENDPOINT, {
    method: "POST",
    signal,
    body: JSON.stringify({
      thread_id: threadId,
      category,
      reason,
    }),
  });
}
