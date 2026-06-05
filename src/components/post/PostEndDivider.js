import styles from "../../styles/components/post/PostEndDivider.module.css";

function PostEndDivider({ label = "end of thread" }) {
  return (
    <div className={styles.divider} role="separator">
      <span className={styles.line} />
      <span className={styles.label}>{label}</span>
      <span className={styles.line} />
    </div>
  );
}

export default PostEndDivider;
