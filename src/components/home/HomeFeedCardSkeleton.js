import styles from "../../styles/components/home/HomeFeedCardSkeleton.module.css";

/**
 * Skeleton placeholder que replica la estructura de HomeFeedCard.
 *
 * Props:
 *   variant: 'short' | 'medium' | 'long' — controla las líneas del body
 *            y la presencia del trending badge (solo en 'medium').
 */
function HomeFeedCardSkeleton({ variant = "medium" }) {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading post">
      <div className={styles.header}>
        <div className={`${styles.bar} ${styles.identicon}`}></div>
        <div className={`${styles.bar} ${styles.maskId}`}></div>
        <div className={`${styles.bar} ${styles.timestamp}`}></div>
        {variant === "medium" && (
          <div className={`${styles.bar} ${styles.trendingBadge}`}></div>
        )}
      </div>
      <div className={styles.body}>
        {variant === "short" && (
          <>
            <div className={`${styles.bar} ${styles.bodyLine} ${styles.line100}`}></div>
            <div className={`${styles.bar} ${styles.bodyLine} ${styles.line65}`}></div>
          </>
        )}
        {variant === "medium" && (
          <>
            <div className={`${styles.bar} ${styles.bodyLine} ${styles.line100}`}></div>
            <div className={`${styles.bar} ${styles.bodyLine} ${styles.line88}`}></div>
            <div className={`${styles.bar} ${styles.bodyLine} ${styles.line62}`}></div>
          </>
        )}
        {variant === "long" && (
          <>
            <div className={`${styles.bar} ${styles.bodyLine} ${styles.line94}`}></div>
            <div className={`${styles.bar} ${styles.bodyLine} ${styles.line100}`}></div>
            <div className={`${styles.bar} ${styles.bodyLine} ${styles.line48}`}></div>
          </>
        )}
      </div>
      <div className={styles.stats}>
        <div className={`${styles.bar} ${styles.statSmall}`}></div>
        <div className={`${styles.bar} ${styles.statMedium}`}></div>
        <div className={`${styles.bar} ${styles.statLarge}`}></div>
      </div>
    </div>
  );
}

export default HomeFeedCardSkeleton;
