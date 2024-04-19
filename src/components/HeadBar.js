import styles from "../styles/components/HeadBar.module.css";

const HeadBar = (props) => {
  return (
    <div className={styles.headerContainer} style={{ ...props.styles }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignContent: "center",
          alignItems: "center",
          paddingLeft: 10,
          paddingRight: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignContent: "center",
            alignItems: "center",
            gap: 5,
          }}
        >
          <div>{props.negative}</div>
          <div>
            <div>{props.title}</div>
            <div>{props.subtitle}</div>
          </div>
        </div>
        <div>{props.positive}</div>
      </div>
    </div>
  );
};

export default HeadBar;
