import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/PostReplySkeleton.module.css";

/**
 * Loading placeholder that mirrors the visual shape of PostReply.
 *
 * Three variants — short / medium / long — vary the number and width of body
 * bars so a stack of skeletons doesn't read as identical clones.
 *
 * Pulse animation lives in CSS (@keyframes skeletonPulse). No timers here.
 */
function PostReplySkeleton({ variant = "medium" }) {
  const { t } = useTranslation();
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label={t("common.loadingReply")}>
      <div className={styles.header}>
        <div className={`${styles.bar} ${styles.identicon}`} />
        <div className={`${styles.bar} ${styles.maskId}`} />
        <div className={`${styles.bar} ${styles.timestamp}`} />
      </div>
      <div className={styles.body}>
        {variant === "short" && (
          <>
            <div className={`${styles.bar} ${styles.line100}`} />
            <div className={`${styles.bar} ${styles.line62}`} />
          </>
        )}
        {variant === "medium" && (
          <>
            <div className={`${styles.bar} ${styles.line100}`} />
            <div className={`${styles.bar} ${styles.line88}`} />
            <div className={`${styles.bar} ${styles.line62}`} />
          </>
        )}
        {variant === "long" && (
          <>
            <div className={`${styles.bar} ${styles.line94}`} />
            <div className={`${styles.bar} ${styles.line100}`} />
            <div className={`${styles.bar} ${styles.line48}`} />
          </>
        )}
      </div>
    </div>
  );
}

export default PostReplySkeleton;
