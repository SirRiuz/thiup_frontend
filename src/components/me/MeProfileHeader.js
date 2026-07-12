import { useState } from "react";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import ProfileAvatarModal from "./ProfileAvatarModal";
import { useCurrentUser } from "../../contexts/CurrentUserContext";
import { useToast } from "../../contexts/ToastContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { formatCompactNumber } from "../../utils/formatNumber";
import styles from "../../styles/components/me/MeProfileHeader.module.css";

/**
 * /me profile header — THREADS' exact profile anatomy on the app's tokens,
 * flat on the surface card (no card-in-card): the name block on the left
 * (display name 24/600 + the copyable mask hash as the "username" line) and
 * the identicon on the right (Threads' 84px desktop / 64px mobile), then the
 * private stats as ONE quiet meta line (their "N followers" language) and
 * the lock privacy note. This is the BASE for anonymous profiles: everything
 * here except the "You" badge and the private stats generalizes to viewing
 * someone else's mask.
 */

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

function MeProfileHeader() {
  const { t, i18n } = useTranslation();
  const { currentUserMask, stats, isLoading } = useCurrentUser();
  const showToast = useToast();
  const isMobile = useIsMobile();

  const hash = currentUserMask?.id || "";
  // Fullscreen avatar viewer (IG's profile-picture dialog).
  const [avatarOpen, setAvatarOpen] = useState(false);
  const statsLoading = isLoading || !stats;

  // "Date joined" — month + year in the UI language ("April 2020" /
  // "abril de 2020"), from the mask's registration date.
  const joinedLabel = (() => {
    if (!currentUserMask?.joinedAt) return null;
    const d = new Date(currentUserMask.joinedAt);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat(i18n.language, {
      month: "long",
      year: "numeric",
    }).format(d);
  })();

  const handleCopy = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      // Plain confirmation, no icon (same pattern as the link/ID copy toasts).
      showToast({ type: "success", message: t("toast.copied"), icon: "none" });
    } catch (e) {
      showToast({ type: "error", message: t("toast.copyFailed") });
    }
  };

  // The stats as one quiet line: "12 threads · 340 reactions · 25 replies" —
  // Threads' followers-line language (no boxed columns), with the VALUES a
  // half-step darker/bolder than the labels so the line scans at a glance.
  const statParts = statsLoading
    ? null
    : [
        [formatCompactNumber(stats?.threads || 0), t("myThreads.statThreads")],
        [
          formatCompactNumber(stats?.reactions || 0),
          t("myThreads.statReactions"),
        ],
        [formatCompactNumber(stats?.replies || 0), t("myThreads.statReplies")],
      ];

  return (
    <section className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.identityBlock}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{t("myThreads.maskName")}</h1>
            {/* "You" — this mask is the viewer's own (private /me only;
                absent when this anatomy renders someone else's mask). */}
            <span className={styles.youBadge}>{t("myThreads.youBadge")}</span>
          </div>
          {/* The mask hash IS the username line (Threads' @handle slot):
              the whole mono pill is a one-tap copy target (the icon doubles
              as the affordance). */}
          <div className={styles.hashRow}>
            <button
              type="button"
              className={styles.hashPill}
              onClick={handleCopy}
              disabled={!hash}
              aria-label={t("myThreads.copyHash")}
              title={t("myThreads.copyHash")}
            >
              <span className={styles.hashText}>{hash || "······"}</span>
              <CopyIcon />
            </button>
          </div>
        </div>
        {/* Threads' exact profile avatar: 84px desktop / 64px mobile, with a
            hairline ring seating it on the cream surface. Your own profile is
            active by definition → the green presence dot. Tapping opens the
            fullscreen viewer (IG's profile-picture dialog). */}
        <button
          type="button"
          className={styles.avatarWrap}
          onClick={() => setAvatarOpen(true)}
          aria-label={t("profile.avatarLabel")}
        >
          <MaskAvatar seed={hash} size={isMobile ? 64 : 84} online />
        </button>
      </div>

      {statParts ? (
        <p className={styles.statsLine}>
          {statParts.map(([value, label], i) => (
            <span key={label} className={styles.statPart}>
              {i > 0 && <span className={styles.statDot}> · </span>}
              <span className={styles.statValue}>{value}</span>{" "}
              {label.toLowerCase()}
            </span>
          ))}
        </p>
      ) : (
        <p className={styles.statsLine} aria-hidden="true">
          <span className={styles.statsSkeleton} />
        </p>
      )}

      {avatarOpen && (
        <ProfileAvatarModal seed={hash} onClose={() => setAvatarOpen(false)} />
      )}

      {/* Registration date — quiet whisper line (calendar + "Joined April
          2020"), generalizes verbatim to other users' profiles. */}
      {joinedLabel && (
        <p className={styles.joinedLine}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{t("myThreads.joined", { date: joinedLabel })}</span>
        </p>
      )}
    </section>
  );
}

export default MeProfileHeader;
