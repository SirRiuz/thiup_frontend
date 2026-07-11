import { useTranslation } from "react-i18next";
import styles from "../../styles/components/home/HomeFeedRetryBanner.module.css";

function getRetryMessage(error, t) {
  if (!error || !error.status) {
    return t("retryBanner.generic");
  }
  if (error.status >= 500) {
    return t("retryBanner.serverIssues");
  }
  if (error.status === 429) {
    return t("retryBanner.tooManyRequests");
  }
  return t("retryBanner.couldNotLoadMore");
}

function HomeFeedRetryBanner({ error, onRetry, isRetrying }) {
  const { t } = useTranslation();
  return (
    <div className={styles.banner} role="alert">
      {isRetrying ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span className={styles.message}>{t("common.retrying")}</span>
        </>
      ) : (
        <>
          <svg
            className={styles.icon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label={t("retryBanner.connectionAria")}
          >
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" />
            <path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" />
          </svg>
          <span className={styles.message}>{getRetryMessage(error, t)}</span>
          <button
            type="button"
            className={styles.button}
            onClick={onRetry}
          >
            {t("common.tryAgain")}
          </button>
        </>
      )}
    </div>
  );
}

export default HomeFeedRetryBanner;
