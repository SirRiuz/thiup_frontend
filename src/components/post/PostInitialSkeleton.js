import PostReplySkeleton from "./PostReplySkeleton";
import styles from "../../styles/components/post/PostInitialSkeleton.module.css";

/**
 * Skeleton del Post page durante el initial loading.
 * Estructura: OP card grande + sort tabs + 3 replies (reutiliza PostReplySkeleton).
 * NO incluye comment box — durante el loading el textarea desaparece.
 */
function PostInitialSkeleton() {
  return (
    <div className={styles.wrapper} aria-busy="true" aria-label="Loading thread">
      <div className={styles.opCard}>
        <div className={styles.opHeader}>
          <div className={`${styles.bar} ${styles.opIdenticon}`}></div>
          <div className={`${styles.bar} ${styles.opMaskId}`}></div>
          <div className={`${styles.bar} ${styles.opTime}`}></div>
        </div>
        <div className={styles.opBody}>
          <div className={`${styles.bar} ${styles.opBodyLine} ${styles.line100}`}></div>
          <div className={`${styles.bar} ${styles.opBodyLine} ${styles.line95}`}></div>
          <div className={`${styles.bar} ${styles.opBodyLine} ${styles.line75}`}></div>
          <div className={`${styles.bar} ${styles.opBodyLine} ${styles.line60}`}></div>
        </div>
        <div className={styles.opReactionBar}>
          <div className={`${styles.bar} ${styles.opReactionPill}`}></div>
          <div className={`${styles.bar} ${styles.opReactionPill}`}></div>
          <div className={`${styles.bar} ${styles.opReactionPill}`}></div>
        </div>
      </div>
      <div className={styles.opDivider}></div>
      <div className={styles.sortRow}>
        <div className={`${styles.bar} ${styles.sortLabel}`}></div>
        <div className={`${styles.bar} ${styles.sortTab}`}></div>
        <div className={`${styles.bar} ${styles.sortTab}`}></div>
        <div className={`${styles.bar} ${styles.sortTab}`}></div>
      </div>
      <div className={styles.repliesList}>
        <PostReplySkeleton variant="medium" />
        <PostReplySkeleton variant="short" />
        <PostReplySkeleton variant="long" />
      </div>
    </div>
  );
}

export default PostInitialSkeleton;
