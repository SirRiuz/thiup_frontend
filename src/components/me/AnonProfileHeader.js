import { useState } from "react";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import ProfileAvatarModal from "./ProfileAvatarModal";
import { useMaskProfile } from "../../hooks/useMaskProfile";
import { useToast } from "../../contexts/ToastContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { formatCompactNumber } from "../../utils/formatNumber";
import styles from "../../styles/components/me/MeProfileHeader.module.css";

/**
 * Anonymous profile header (/m/:maskId) — the SAME Threads profile
 * anatomy as /me's MeProfileHeader (it shares that stylesheet verbatim),
 * minus the owner-only bits: no "You" pill, and the stats are the PUBLIC
 * pair (posts · replies) from /users/<id>/ instead of the private trio.
 * The identicon and hash are already public on every card — this screen
 * reveals nothing new about the mask.
 */

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

function AnonProfileHeader({ maskId }) {
  const { t, i18n } = useTranslation();
  const showToast = useToast();
  const isMobile = useIsMobile();
  // Cached per hash (the hover card shares the same entry): joined +
  // public posts/replies counts. The endpoint accepts the public 6-hex id.
  const { profile, isLoading } = useMaskProfile(maskId);
  // Fullscreen avatar viewer (IG's profile-picture dialog).
  const [avatarOpen, setAvatarOpen] = useState(false);

  const handleCopy = async () => {
    if (!maskId) return;
    try {
      await navigator.clipboard.writeText(maskId);
      showToast({ type: "success", message: t("toast.copied"), icon: "none" });
    } catch (e) {
      showToast({ type: "error", message: t("toast.copyFailed") });
    }
  };

  const joinedLabel = (() => {
    if (!profile?.joinedAt) return null;
    const d = new Date(profile.joinedAt);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat(i18n.language, {
      month: "long",
      year: "numeric",
    }).format(d);
  })();

  // Same trio (and order) as /me's stats line: posts · reactions · replies.
  const statParts = isLoading
    ? null
    : [
        [formatCompactNumber(profile?.postsCount || 0), t("profile.posts")],
        [
          formatCompactNumber(profile?.reactionsCount || 0),
          t("myThreads.statReactions"),
        ],
        [formatCompactNumber(profile?.repliesCount || 0), t("profile.replies")],
      ];

  return (
    <section className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.identityBlock}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{t("myThreads.maskName")}</h1>
          </div>
          <div className={styles.hashRow}>
            <button
              type="button"
              className={styles.hashPill}
              onClick={handleCopy}
              aria-label={t("myThreads.copyHash")}
              title={t("myThreads.copyHash")}
            >
              <span className={styles.hashText}>{maskId}</span>
              <CopyIcon />
            </button>
          </div>
        </div>
        {/* Presence from /users/<id>/ (ephemeral, 60s TTL) → the green
            dot; tapping opens the fullscreen viewer. */}
        <button
          type="button"
          className={styles.avatarWrap}
          onClick={() => setAvatarOpen(true)}
          aria-label={t("profile.avatarLabel")}
        >
          <MaskAvatar
            seed={maskId}
            size={isMobile ? 64 : 84}
            online={profile?.isOnline}
          />
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
        <ProfileAvatarModal seed={maskId} onClose={() => setAvatarOpen(false)} />
      )}

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

export default AnonProfileHeader;
