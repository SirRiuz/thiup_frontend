import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
 * Live "Disappears in Xh/Xm" text for a Snap (self-deleting) thread,
 * re-rendered every minute (hours-scale, so a 1s tick would be wasted
 * work). Shared by ThreadFlagBadges (thread view) and HomeFeedCard (feed
 * row) so both surfaces show the same real countdown instead of a bare,
 * unlabeled icon. Returns null when the thread isn't Snap or has no
 * deadline yet.
 */
export default function useSnapCountdown(isSnap, expiresAt) {
  const { t } = useTranslation();
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!isSnap || !expiresAt) return undefined;
    const id = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, [isSnap, expiresAt]);

  if (!isSnap) return null;
  return snapLabel(expiresAt, t);
}
