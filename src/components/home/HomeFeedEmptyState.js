import styles from "../../styles/components/home/HomeFeedEmptyState.module.css";

function HomeFeedEmptyState({ onComposeClick }) {
  return (
    <div className={styles.empty}>
      <div className={styles.iconWrap}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9b9591"
          strokeWidth="1.5"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p className={styles.title}>No posts yet</p>
      <p className={styles.subtitle}>be the first to start a thread</p>
      <button type="button" className={styles.button} onClick={onComposeClick}>
        new thread
      </button>
    </div>
  );
}

export default HomeFeedEmptyState;
