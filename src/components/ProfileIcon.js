import { useState } from "react";

export default function ProfileIcon(props) {
  const [isLoading, setLoad] = useState(true);
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: "100%",
          height: "100%",
          justifyContent: "end",
          alignItems: "end",
          marginLeft: 6,
          marginTop: 4,
          zIndex: 1,
        }}
      >
        {props.flag}
      </div>
      <div
        style={{
          width: props.iconSize !== undefined ? props.iconSize : 23,
          height: props.iconSize !== undefined ? props.iconSize : 23,
          position: "relative",
        }}
      >
        {isLoading && (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "rgb(229, 229, 229)",
              position: "absolute",
              borderRadius:
                "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
            }}
          />
        )}
        <img
          src={props.url}
          lazy={"true"}
          width={"100%"}
          onLoad={() => setLoad(() => false)}
          onError={() => {
            setLoad(() => true);
          }}
          height={"100%"}
          style={{
            objectFit: "cover",
            borderRadius: "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
          }}
        />
      </div>
    </div>
  );
}
