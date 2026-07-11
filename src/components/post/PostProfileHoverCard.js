import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import { useMaskProfile } from "../../hooks/useMaskProfile";
import styles from "../../styles/components/post/PostProfileHoverCard.module.css";
import cx from "../../utils/cx";

/**
 * Format an ISO date string as "mon yyyy" lowercase in the UI language.
 *   "2025-03-14" → "mar 2025"
 *   invalid / missing → unknownLabel (translated)
 */
function formatJoinedDate(isoString, locale, unknownLabel) {
  if (!isoString) return unknownLabel;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return unknownLabel;
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" })
    .format(date)
    .toLowerCase();
}

/**
 * Profile hover card — the PROFILE HEADER anatomy in miniature (exactly how
 * Threads' hover card mirrors their profile header): name block left
 * ("Anonymous" + the mask hash as the mono handle line), identicon right,
 * then the stats as ONE quiet meta line and the "joined" whisper — the same
 * language as /me's `MeProfileHeader`, so a mask reads identically wherever
 * it appears.
 *
 * The REAL data (joined, posts, replies) is requested from the backend when
 * the card mounts (= on hover, with its delay) via useMaskProfile (with a
 * cache by hash: the second hover doesn't repeat the request or skeleton).
 * While loading: warm skeleton. If it fails: discreet fallback to whatever
 * the mask carried (without breaking).
 *
 * Props:
 *   - mask: { id, fullHash, joinedAt?, postsCount?, repliesCount? }
 *   - onMouseEnter / onMouseLeave: forwarded from the trigger so the card
 *     participates in the same hover "safe zone".
 */
function PostProfileHoverCard({ mask, onMouseEnter, onMouseLeave }) {
  const { t, i18n } = useTranslation();
  const { profile, isLoading } = useMaskProfile(mask?.fullHash);

  if (!mask) return null;

  const { id } = mask;
  // Real data if it arrived; otherwise (error / no fullHash), whatever the
  // mask from the listing carried (search users already bring joined/posts).
  const joinedAt = profile?.joinedAt ?? mask.joinedAt;
  const posts = profile?.postsCount ?? mask.postsCount ?? 0;
  const replies = profile?.repliesCount ?? mask.repliesCount ?? 0;
  const formattedJoined = formatJoinedDate(
    joinedAt,
    i18n.language,
    t("profile.unknown")
  );

  return (
    <div
      className={styles.card}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Name block left · avatar right — the profile header's top row. */}
      <div className={styles.topRow}>
        <div className={styles.identityBlock}>
          <p className={styles.name}>{t("myThreads.maskName")}</p>
          {/* The hash as the handle line (the profile's mono pill). */}
          <span className={styles.hashPill} title={id}>
            {id}
          </span>
        </div>
        {/* Presence comes from the listing's mask (fresh per feed render) —
            the profile fetch is session-cached and would show a stale dot. */}
        <span className={styles.avatarWrap}>
          <MaskAvatar seed={id} size={56} online={mask.isOnline} />
        </span>
      </div>

      {isLoading ? (
        /* Warm skeleton while the real data arrives (the identity block is
           already known from the trigger, doesn't need one). */
        <>
          <span className={cx(styles.skeletonBar, styles.skeletonStats)} />
          <span className={cx(styles.skeletonBar, styles.skeletonJoined)} />
        </>
      ) : (
        <>
          {/* Stats as ONE quiet line — values a half-step darker/bolder
              (the /me statsLine spec). */}
          <p className={styles.statsLine}>
            <span className={styles.statPart}>
              <span className={styles.statValue}>{posts}</span>{" "}
              {t("profile.posts").toLowerCase()}
            </span>
            <span className={styles.statDot}> · </span>
            <span className={styles.statPart}>
              <span className={styles.statValue}>{replies}</span>{" "}
              {t("profile.replies").toLowerCase()}
            </span>
          </p>
          {/* The "joined" whisper (calendar + month/year). */}
          <p className={styles.joinedLine}>
            <svg
              width="12"
              height="12"
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
            <span>{t("profile.joined", { date: formattedJoined })}</span>
          </p>
        </>
      )}
    </div>
  );
}

export default PostProfileHoverCard;
