import { useTranslation } from "react-i18next";
import styles from "../../styles/components/home/HomeFeedSpinner.module.css";

function HomeFeedSpinner() {
  const { t } = useTranslation();
  return (
    <div className={styles.wrapper} role="status" aria-label={t("home.loadingMore")}>
      <div className={styles.spinner}></div>
      <span className={styles.label}>{t("common.loading")}</span>
    </div>
  );
}

export default HomeFeedSpinner;
