import styles from "../styles/components/Separator.module.css";

export default function Separator(props) {
  return <div className={styles.container} style={{ ...props.style }} />;
}
