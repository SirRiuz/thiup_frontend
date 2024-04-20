import styles from "../styles/components/ThreadCard.module.css";

export default function AdsCard(props) {
  return (
    <div style={{ position: "relative", ...props.style }}>
      <span className={styles.threadDateInfo}>Sponsored</span>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignContent: "center",
          alignItems:"center",
          background: "red",
          marginTop: 10,
          background: "rgb(229, 229, 229)",
          height: 432,
          borderRadius: "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
        }}
      >
        x
      </div>
    </div>
  );
}
