import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/PostEndDivider.module.css";

function PostEndDivider({ label }) {
  const { t } = useTranslation();
  return (
    <div className={styles.divider} role="separator">
      <span className={styles.line} />
      <span className={styles.label}>{label || t("post.endOfThread")}</span>
      <span className={styles.line} />
    </div>
  );
}

export default PostEndDivider;
