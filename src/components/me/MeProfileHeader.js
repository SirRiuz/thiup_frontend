import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import { useCurrentUser } from "../../contexts/CurrentUserContext";
import { useToast } from "../../contexts/ToastContext";
import { formatCompactNumber } from "../../utils/formatNumber";
import styles from "../../styles/components/me/MeProfileHeader.module.css";

/**
 * /me header card — the user's ANONYMOUS identity + PRIVATE stats. Shown ONLY
 * on /me (their own private screen): identicon (procedural, from MaskAvatar) +
 * "Anonymous" + short mask hash (copyable) + threads/reactions/replies + a
 * privacy note. The stats/hash are the owner's own (backend returns them only
 * for request.mask); nothing here is exposed to other users.
 */

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

function Stat({ value, label, loading }) {
  return (
    <div className={styles.stat}>
      {loading ? (
        <span className={styles.statSkeleton} aria-hidden="true" />
      ) : (
        <span className={styles.statValue}>{formatCompactNumber(value || 0)}</span>
      )}
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function MeProfileHeader() {
  const { t } = useTranslation();
  const { currentUserMask, stats, isLoading } = useCurrentUser();
  const showToast = useToast();

  const hash = currentUserMask?.id || "";
  const statsLoading = isLoading || !stats;

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

  return (
    <section className={styles.card}>
      <div className={styles.identity}>
        <span className={styles.avatarRing}>
          <MaskAvatar seed={hash} size={58} />
        </span>
        <div className={styles.identityText}>
          <div className={styles.nameRow}>
            <span className={styles.maskName}>{t("myThreads.maskName")}</span>
            {/* "You" — this mask is the viewer's own (private /me only). */}
            <span className={styles.youBadge}>{t("myThreads.youBadge")}</span>
          </div>
          <div className={styles.hashRow}>
            <span className={styles.hashPill}>{hash || "······"}</span>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={handleCopy}
              disabled={!hash}
              aria-label={t("myThreads.copyHash")}
              title={t("myThreads.copyHash")}
            >
              <CopyIcon />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <Stat
          value={stats?.threads}
          label={t("myThreads.statThreads")}
          loading={statsLoading}
        />
        <Stat
          value={stats?.reactions}
          label={t("myThreads.statReactions")}
          loading={statsLoading}
        />
        <Stat
          value={stats?.replies}
          label={t("myThreads.statReplies")}
          loading={statsLoading}
        />
      </div>

      <p className={styles.privacy}>
        <LockIcon />
        <span>{t("myThreads.privacyNote")}</span>
      </p>
    </section>
  );
}

export default MeProfileHeader;
