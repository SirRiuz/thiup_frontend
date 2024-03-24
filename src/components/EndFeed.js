import styles from "../styles/components/EndFeed.module.css"


export default function EndFeed(props) {
  return (
    <div
      className={styles.container}
      style={props.styles}
    >
      <span className={styles.text}>
        🏁 End of results.
      </span>
    </div>
  )
}
