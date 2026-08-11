import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import cx from "../utils/cx";
import { getRateLimitWait } from "../utils/rateLimit";
import styles from "../styles/components/RateLimitNotice.module.css";

// One geometry for both sizes — the dial scales the SVG via CSS.
const RING_BOX = 40;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_BOX - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
// Sub-second ticks so the ring drains smoothly, not in 1s jumps.
const TICK_MS = 250;
// How long the "you can post again now" beat holds before onExpire clears it.
const READY_HOLD_MS = 1600;

// Whole seconds left until an absolute deadline (null → no countdown at all).
const remainingSeconds = (deadline) =>
  deadline == null ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

const COPY = {
  post: {
    title: "rateLimit.postTitle",
    wait: "rateLimit.postWait",
    soon: "rateLimit.postSoon",
    ready: "rateLimit.postReady",
  },
  reply: {
    title: "rateLimit.replyTitle",
    wait: "rateLimit.replyWait",
    soon: "rateLimit.replySoon",
    ready: "rateLimit.replyReady",
  },
  edit: {
    title: "rateLimit.editTitle",
    wait: "rateLimit.editWait",
    soon: "rateLimit.editSoon",
    ready: "rateLimit.editReady",
  },
};

/**
 * RateLimitNotice — the app's single rate-limit (HTTP 429) surface, shared by
 * the thread composer, the inline reply box and the expanded reply dialog.
 *
 * Being throttled is NOT an error: nothing broke and there is nothing to fix,
 * you just have to wait. So it does NOT wear the danger palette — it is a warm
 * terracotta notice (the same tactful language as the composer's location
 * notes) with an hourglass in a draining ring that counts the wait down.
 * Real errors keep their red banner; this component is only for 429.
 *
 * The wait comes from the backend as an absolute deadline carried by the ERROR
 * (see utils/rateLimit): the notice unmounts and remounts while the same 429
 * stands (collapsing/expanding the composer), and both the ring and the
 * seconds resume exactly where they were instead of restarting. When the
 * backend didn't say how long, the ring is dropped and the copy loses the
 * countdown — never a made-up number. Reaching zero holds a short "you can try
 * again now" beat and then calls onExpire so the consumer can clear the state.
 */
function RateLimitNotice({
  error,
  variant = "post",
  onDismiss,
  onExpire,
  compact = false,
  className,
}) {
  const { t } = useTranslation();
  const copy = COPY[variant] || COPY.post;
  // The window (the ring's 100%) and the instant it ends — both stable for as
  // long as this error lives.
  const { seconds: total, deadline } = getRateLimitWait(error) || {};
  const [left, setLeft] = useState(() => remainingSeconds(deadline));
  // Kept in a ref so a consumer's inline callback can't restart the timers.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Ticking off the DEADLINE (not off a chained interval, which drifts and
  // stalls while the tab is backgrounded) is also what makes the countdown
  // survive a remount: the first paint already shows the real remainder.
  useEffect(() => {
    setLeft(remainingSeconds(deadline));
    if (deadline == null) return undefined;
    const id = setInterval(() => {
      const rest = remainingSeconds(deadline);
      setLeft(rest);
      if (rest === 0) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [deadline]);

  // Countdown finished: hold the "you can try again now" line for a beat, then
  // hand control back to the consumer (which drops the notice).
  useEffect(() => {
    if (total == null || left == null || left > 0) return undefined;
    const id = setTimeout(() => onExpireRef.current?.(), READY_HOLD_MS);
    return () => clearTimeout(id);
  }, [left, total]);

  const counting = left != null && left > 0;
  const detail = counting
    ? t(copy.wait, { seconds: left })
    : left === 0
    ? t(copy.ready)
    : t(copy.soon);
  // Full ring at the start, empty at zero.
  const drained = total == null || left == null ? 0 : 1 - left / total;

  return (
    <div
      className={cx(styles.notice, compact ? styles.compact : "", className)}
      role="status"
    >
      <span className={styles.dial} aria-hidden="true">
        {total != null && (
          <svg
            className={styles.ring}
            viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
            focusable="false"
          >
            <circle
              className={styles.ringTrack}
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={RING_RADIUS}
              strokeWidth={RING_STROKE}
            />
            <circle
              className={styles.ringProgress}
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={RING_RADIUS}
              strokeWidth={RING_STROKE}
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * drained}
            />
          </svg>
        )}
        {/* Hourglass (the app's outline style): "wait", not "something broke". */}
        <svg
          className={styles.glyph}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 3h12M6 21h12" />
          <path d="M8 3v4l4 5-4 5v4" />
          <path d="M16 3v4l-4 5 4 5v4" />
        </svg>
      </span>

      <div className={styles.text}>
        <p className={styles.title}>{t(copy.title)}</p>
        {/* While the seconds tick, the visible line would re-announce itself
            every second — screen readers get the static sentence instead. */}
        <p className={styles.detail} aria-hidden={counting || undefined}>
          {detail}
        </p>
        {counting && <span className={styles.srOnly}>{t(copy.soon)}</span>}
      </div>

      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label={t("common.dismissError")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default RateLimitNotice;
