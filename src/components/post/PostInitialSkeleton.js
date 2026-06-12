import { useTranslation } from "react-i18next";
import PostReplySkeleton from "./PostReplySkeleton";
import styles from "../../styles/components/post/PostInitialSkeleton.module.css";

/**
 * Skeleton for the Post page during the initial loading.
 * Structure: large OP card + sort tabs + 3 replies (reuses PostReplySkeleton).
 * Does NOT include the comment box — during loading the textarea disappears.
 */
function PostInitialSkeleton() {
  const { t } = useTranslation();
  return (
    <div className={styles.wrapper} aria-busy="true" aria-label={t("common.loadingThread")}>
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
