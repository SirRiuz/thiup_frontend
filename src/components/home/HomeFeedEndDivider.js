import styles from "../../styles/components/home/HomeFeedEndDivider.module.css";

function HomeFeedEndDivider() {
  return (
    <div className={styles.wrapper} aria-hidden="true">
      <span className={styles.line}></span>
      <span className={styles.label}>end of feed</span>
      <span className={styles.line}></span>
    </div>
  );
}

export default HomeFeedEndDivider;
