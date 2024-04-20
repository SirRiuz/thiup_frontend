import { Tooltip } from "@mui/material";
import { RotatingLines } from "react-loader-spinner";

const Button = (props) => {
  const onClick = (_) => {
    if (props.isFocus && props.onClick && !props.isLoad) props.onClick();
  };

  return (
    <Tooltip title={props.isFocus && !props.isLoad ? "Comment" : null}>
      <div
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgb(107, 74, 252)",
          borderRadius: 5.77148,
          boxShadow: `rgba(107, 74, 252, 0.12) 
                      0px 0px 0px 1px, rgba(107, 74, 252, 0.4) 0px 
                      2px 8px, rgba(107, 74, 252, 0.12) 0px 2px 4px`,
          color: "rgb(239, 239, 241)",
          height: 32,
          paddingLeft: 10,
          paddingRight: 10,
          cursor: props.isFocus && !props.isLoad ? "pointer" : "auto",
          opacity: props.isFocus ? 1 : 0.5,
          ...props.style,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {props.isLoad ? (
            <RotatingLines
              strokeColor="white"
              strokeWidth="5"
              animationDuration="0.75"
              width="15"
              visible={true}
            />
          ) : props.placeholder ? (
            props.placeholder
          ) : (
            "Comment"
          )}
        </span>
      </div>
    </Tooltip>
  );
};

export default Button;
