const ReactionIcon = (props) => {
  return (
    <div
      onClick={props.onClick}
      style={{
        background: "rgb(248, 246, 255)",
        color: "rgb(107, 74, 252)",
        display: "flex",
        justifyContent: "center",
        alignContent: "center",
        alignItems: "center",
        padding: 2,
        gap: 4,
        minWidth: 50,
        cursor: "pointer",
        borderRadius: 7,
        ...props.style,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          backgroundPosition: "center",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundImage: `url(${props.iconUrl})`,
          ...props.style.iconStyle,
        }}
      />
      <div>
        <strong>{props.count}</strong>
      </div>
    </div>
  );
};

export default ReactionIcon;
