import styles from "../../styles/components/home/HomeFeedSpinner.module.css";

function HomeFeedSpinner() {
  return (
    <div className={styles.wrapper} role="status" aria-label="Loading more posts">
      <div className={styles.spinner}></div>
      <span className={styles.label}>loading</span>
    </div>
  );
}

export default HomeFeedSpinner;
