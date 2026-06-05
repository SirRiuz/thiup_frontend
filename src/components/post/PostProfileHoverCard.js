import MaskAvatar from "../MaskAvatar";
import { useMaskProfile } from "../../hooks/useMaskProfile";
import styles from "../../styles/components/post/PostProfileHoverCard.module.css";

/**
 * Format an ISO date string as "mon yyyy" lowercase.
 *   "2025-03-14" → "mar 2025"
 *   invalid / missing → "unknown"
 */
function formatJoinedDate(isoString) {
  if (!isoString) return "unknown";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date
    .toLocaleString("en-US", { month: "short", year: "numeric" })
    .toLowerCase();
}

/**
 * Profile hover card — minimal vertical layout (variant B).
 *
 * Los datos REALES (joined, posts, replies) se piden al backend al montar la
 * tarjeta (= al hover, con su delay) vía useMaskProfile (con caché por hash:
 * el segundo hover no repite request ni skeleton). Mientras carga: skeleton
 * warm. Si falla: fallback discreto a lo que trajera el mask (sin romper).
 *
 * Props:
 *   - mask: { id, fullHash, joinedAt?, postsCount?, repliesCount? }
 *   - onMouseEnter / onMouseLeave: forwarded from the trigger so the card
 *     participates in the same hover "safe zone".
 */
function PostProfileHoverCard({ mask, onMouseEnter, onMouseLeave }) {
  const { profile, isLoading } = useMaskProfile(mask?.fullHash);

  if (!mask) return null;

  const { id } = mask;
  // Datos reales si llegaron; si no (error / sin fullHash), lo que trajera el
  // mask del listado (los users de búsqueda ya traen joined/posts).
  const joinedAt = profile?.joinedAt ?? mask.joinedAt;
  const posts = profile?.postsCount ?? mask.postsCount ?? 0;
  const replies = profile?.repliesCount ?? mask.repliesCount ?? 0;
  const formattedJoined = formatJoinedDate(joinedAt);

  return (
    <div
      className={styles.card}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.identiconWrap}>
        <MaskAvatar seed={id} size={56} />
      </div>
      <p className={styles.hash} title={id}>
        {id}
      </p>

      {isLoading ? (
        /* Skeleton warm mientras llegan los datos reales (el mask ID ya se
           conoce del trigger, no necesita skeleton). */
        <>
          <span className={`${styles.skeletonBar} ${styles.skeletonJoined}`} />
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span
                className={`${styles.skeletonBar} ${styles.skeletonStatValue}`}
              />
              <span className={styles.statLabel}>posts</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span
                className={`${styles.skeletonBar} ${styles.skeletonStatValue}`}
              />
              <span className={styles.statLabel}>replies</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className={styles.joined}>joined {formattedJoined}</p>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{posts}</span>
              <span className={styles.statLabel}>posts</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>{replies}</span>
              <span className={styles.statLabel}>replies</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PostProfileHoverCard;
