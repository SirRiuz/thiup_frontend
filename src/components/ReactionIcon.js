import { Tooltip } from "@mui/material";
import { useEffect } from "react";

const Stepper = ({ num }) => {
  const arr = Array.from(new Array(10));
  return (
    <div data-num={num} className="stepper">
      {arr.map(function (e, index) {
        return (
          <strong key={index} className="stepper-value">
            {index}
          </strong>
        );
      })}
    </div>
  );
};

const Odometer = ({ number }) => {
  useEffect(() => {
    requestAnimationFrame(animate);
    function animate() {
      const elems = document.getElementsByClassName("stepper");
      [...elems].forEach(function (e) {
        requestAnimationFrame(() => {
          const numToStop = e.dataset.num;
          e.style.top = `-${20 * parseInt(numToStop)}px`;
          e.style.tansitionDelay = `${100 * (10 - parseInt(numToStop))}`;
        });
      });
    }
  });

  const nums = `${number}`.split("");
  return (
    <div className="odometer">
      {nums.map(function (value, index) {
        return <Stepper key={index} num={value} />;
      })}
    </div>
  );
};

const ReactionIcon = (props) => {
  return (
    <Tooltip arrow title={props.name}>
      <div
        onClick={() => {
          if (props.onClick) props.onClick(props);
        }}
        style={{
          color: "rgb(107, 74, 252)",
          display: "flex",
          justifyContent: "center",
          alignContent: "center",
          alignItems: "center",
          gap: 5,
          minWidth: 52,
          cursor: "pointer",
          borderRadius: "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
          ...props.style,
        }}
      >
        <img
          width={17}
          height={17}
          src={props.url}
          lazy={"true"}
          style={{
            borderRadius: 3,
            objectFit: "contain",
            ...props.style?.iconStyle,
          }}
        />
        {props.count && <Odometer number={`${props.count}`} />}
      </div>
    </Tooltip>
  );
};

export default ReactionIcon;
