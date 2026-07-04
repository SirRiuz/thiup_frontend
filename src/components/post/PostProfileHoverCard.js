import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import { useMaskProfile } from "../../hooks/useMaskProfile";
import styles from "../../styles/components/post/PostProfileHoverCard.module.css";

/**
 * Format an ISO date string as "mon yyyy" lowercase.
 *   "2025-03-14" → "mar 2025"
 *   invalid / missing → unknownLabel (translated)
 */
function formatJoinedDate(isoString, unknownLabel) {
  if (!isoString) return unknownLabel;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return unknownLabel;
  return date
    .toLocaleString(undefined, { month: "short", year: "numeric" })
    .toLowerCase();
}

/**
 * Profile hover card — minimal vertical layout (variant B).
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
  const { t } = useTranslation();
  const { profile, isLoading } = useMaskProfile(mask?.fullHash);

  if (!mask) return null;

  const { id } = mask;
  // Real data if it arrived; otherwise (error / no fullHash), whatever the
  // mask from the listing carried (search users already bring joined/posts).
  const joinedAt = profile?.joinedAt ?? mask.joinedAt;
  const posts = profile?.postsCount ?? mask.postsCount ?? 0;
  const replies = profile?.repliesCount ?? mask.repliesCount ?? 0;
  const formattedJoined = formatJoinedDate(joinedAt, t("profile.unknown"));

  return (
    <div
      className={styles.card}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.identiconWrap}>
        {/* Presence comes from the listing's mask (fresh per feed render) —
            the profile fetch is session-cached and would show a stale dot. */}
        <MaskAvatar seed={id} size={56} online={mask.isOnline} />
      </div>
      <p className={styles.hash} title={id}>
        {id}
      </p>

      {isLoading ? (
        /* Warm skeleton while the real data arrives (the mask ID is already
           known from the trigger, doesn't need a skeleton). */
        <>
          <span className={`${styles.skeletonBar} ${styles.skeletonJoined}`} />
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span
                className={`${styles.skeletonBar} ${styles.skeletonStatValue}`}
              />
              <span className={styles.statLabel}>{t("profile.posts")}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span
                className={`${styles.skeletonBar} ${styles.skeletonStatValue}`}
              />
              <span className={styles.statLabel}>{t("profile.replies")}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className={styles.joined}>
            {t("profile.joined", { date: formattedJoined })}
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{posts}</span>
              <span className={styles.statLabel}>{t("profile.posts")}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>{replies}</span>
              <span className={styles.statLabel}>{t("profile.replies")}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PostProfileHoverCard;
