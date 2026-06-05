import styles from "../../styles/components/home/HomeFeedRetryBanner.module.css";

function getRetryMessage(error) {
  if (!error || !error.status) {
    return "Couldn't load more — check your connection";
  }
  if (error.status >= 500) {
    return "Server is having issues";
  }
  if (error.status === 429) {
    return "Too many requests — wait a moment";
  }
  return "Couldn't load more posts";
}

function HomeFeedRetryBanner({ error, onRetry, isRetrying }) {
  return (
    <div className={styles.banner} role="alert">
      {isRetrying ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span className={styles.message}>Retrying...</span>
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
            aria-label="Connection lost"
          >
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" />
            <path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" />
          </svg>
          <span className={styles.message}>{getRetryMessage(error)}</span>
          <button
            type="button"
            className={styles.button}
            onClick={onRetry}
          >
            try again
          </button>
        </>
      )}
    </div>
  );
}

export default HomeFeedRetryBanner;
