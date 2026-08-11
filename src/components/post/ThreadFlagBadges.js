import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import cx from "../../utils/cx";
import styles from "../../styles/components/post/ThreadFlagBadges.module.css";

/* Outline "lock" — same glyph as PostOptionsPanel's Private row. */
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
/* Outline clock — same glyph as PostOptionsPanel's Snap row. Exported so
   feed cards (HomeFeedCard) can reuse the exact glyph for their own,
   simpler "this thread is temporary" signal. */
export const SnapIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l3 2" />
    <path d="M9 2h6" />
  </svg>
);

// Renders the countdown off the ABSOLUTE deadline (expiresAt), never a
// server-computed "X hours left" string that would go stale between fetch
// and render — same idea as RateLimitNotice's countdown.
function snapLabel(expiresAt, t) {
  if (!expiresAt) return null;
  const deadline = new Date(expiresAt).getTime();
  if (Number.isNaN(deadline)) return null;
  const ms = deadline - Date.now();
  if (ms <= 0) return t("post.snapExpiringSoon");
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return t("post.snapCountdownHours", { count: hours });
  const minutes = Math.max(1, Math.round(ms / 60000));
  return t("post.snapCountdownMinutes", { count: minutes });
}

/**
 * The two flag badges riding the OP header alongside "· Edited": the private
 * lock and the snap self-delete countdown (re-rendered every minute —
 * hours-scale, so a 1s tick would be wasted work).
 *
 * Private has no urgency, so it stays quiet meta — same anatomy as
 * EditedTag: a "·" divider + Inter timestamp-identical text, `#a3a3a3`;
 * `className`/`dividerClassName` are the caller's existing
 * `.editedTag`/`.editedDivider`-equivalent classes so the tone matches
 * exactly without duplicating the declarations.
 *
 * Snap IS time-sensitive, so it graduates into its own warm-accent pill
 * (own CSS module, not the caller's quiet-meta classes) — the same
 * `#b8845f` used for the feed card's Snap ring/wash/header icon, so it
 * reads as one consistent signal across the app.
 */
function ThreadFlagBadges({ isPrivate, isSnap, expiresAt, className, dividerClassName }) {
  const { t } = useTranslation();
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!isSnap || !expiresAt) return undefined;
    const id = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, [isSnap, expiresAt]);

  if (!isPrivate && !isSnap) return null;
  const countdown = isSnap ? snapLabel(expiresAt, t) : null;

  return (
    <>
      {isPrivate && (
        <span className={cx(className)} title={t("post.privateBadgeHint")}>
          <span className={dividerClassName} aria-hidden="true">
            ·
          </span>
          <LockIcon />
          <span>{t("post.privateBadge")}</span>
        </span>
      )}
      {countdown && (
        <span className={styles.snapChip} title={t("post.snapBadgeHint")}>
          <SnapIcon />
          <span className={styles.snapText}>{countdown}</span>
        </span>
      )}
    </>
  );
}

export default ThreadFlagBadges;
