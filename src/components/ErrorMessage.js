import styles from "../styles/components/ErrorMessage.module.css";

export default function ErrorMessage(props) {
  return (
    <div className={styles.noDataResultContainer}>
      <div style={{ marginBottom: 10 }}>
        <span className={styles.title} style={{ fontSize: 15 }}>
          {props.title}
        </span>
      </div>
      <div>
        <span className={styles.suptitle} style={{ fontSize: 15 }}>
          {props.description}
        </span>
      </div>
    </div>
  );
}
