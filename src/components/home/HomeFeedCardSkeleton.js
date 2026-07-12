import { useTranslation } from "react-i18next";
import styles from "../../styles/components/home/HomeFeedCardSkeleton.module.css";
import cx from "../../utils/cx";

/**
 * Skeleton placeholder that replicates the structure of HomeFeedCard.
 *
 * Props:
 *   variant: 'short' | 'medium' | 'long' — controls the body lines and the
 *            presence of the trending badge (only in 'medium').
 */
function HomeFeedCardSkeleton({ variant = "medium" }) {
  const { t } = useTranslation();
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label={t("common.loadingPost")}>
      {/* Mirrors HomeFeedCard's Threads grid: avatar gutter + content column. */}
      <div className={styles.grid}>
      <div className={cx(styles.bar, styles.identicon)}></div>
      <div className={styles.content}>
      <div className={styles.header}>
        <div className={cx(styles.bar, styles.maskId)}></div>
        <div className={cx(styles.bar, styles.timestamp)}></div>
        {variant === "medium" && (
          <div className={cx(styles.bar, styles.trendingBadge)}></div>
        )}
      </div>
      <div className={styles.body}>
        {variant === "short" && (
          <>
            <div className={cx(styles.bar, styles.bodyLine, styles.line100)}></div>
            <div className={cx(styles.bar, styles.bodyLine, styles.line65)}></div>
          </>
        )}
        {variant === "medium" && (
          <>
            <div className={cx(styles.bar, styles.bodyLine, styles.line100)}></div>
            <div className={cx(styles.bar, styles.bodyLine, styles.line88)}></div>
            <div className={cx(styles.bar, styles.bodyLine, styles.line62)}></div>
          </>
        )}
        {variant === "long" && (
          <>
            <div className={cx(styles.bar, styles.bodyLine, styles.line94)}></div>
            <div className={cx(styles.bar, styles.bodyLine, styles.line100)}></div>
            <div className={cx(styles.bar, styles.bodyLine, styles.line48)}></div>
          </>
        )}
      </div>
      <div className={styles.stats}>
        <div className={cx(styles.bar, styles.statSmall)}></div>
        <div className={cx(styles.bar, styles.statMedium)}></div>
        <div className={cx(styles.bar, styles.statLarge)}></div>
      </div>
      </div>
      </div>
    </div>
  );
}

export default HomeFeedCardSkeleton;
