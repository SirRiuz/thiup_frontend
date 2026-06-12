import { useTranslation } from "react-i18next";
import styles from "../../styles/components/search/SearchEmptyState.module.css";

function SearchEmptyState() {
  const { t } = useTranslation();
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
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <p className={styles.title}>{t("search.noResultsTitle")}</p>
      <p className={styles.subtitle}>{t("search.noResultsSubtitle")}</p>
    </div>
  );
}

export default SearchEmptyState;
