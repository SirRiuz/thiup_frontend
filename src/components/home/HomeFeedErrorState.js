import { useTranslation } from "react-i18next";
import styles from "../../styles/components/home/HomeFeedErrorState.module.css";

function HomeFeedErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className={styles.container} role="alert">
      <svg
        className={styles.icon}
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label={t("feedError.cloudAria")}
      >
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" />
        <path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" />
      </svg>
      <p className={styles.title}>{t("feedError.title")}</p>
      <p className={styles.subtitle}>{t("feedError.subtitle")}</p>
      {error?.message && <p className={styles.detail}>{error.message}</p>}
      <button type="button" className={styles.button} onClick={onRetry}>
        {t("common.tryAgain")}
      </button>
    </div>
  );
}

export default HomeFeedErrorState;
