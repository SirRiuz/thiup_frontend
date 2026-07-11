import { useTranslation } from "react-i18next";
import styles from "../../styles/components/home/HomeFeedEndDivider.module.css";

function HomeFeedEndDivider() {
  const { t } = useTranslation();
  return (
    <div className={styles.wrapper} aria-hidden="true">
      <span className={styles.line}></span>
      <span className={styles.label}>{t("home.endOfFeed")}</span>
      <span className={styles.line}></span>
    </div>
  );
}

export default HomeFeedEndDivider;
