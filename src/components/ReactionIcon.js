import { Tooltip } from "@mui/material";
import { useEffect } from "react"


const Stepper = ({ num }) => {
  const arr = Array.from(new Array(10));
  return <div data-num={num} className="stepper">
    {arr.map(function (e, index) {
      return (
        <strong
          key={index}
          className="stepper-value"
        >
          {index}
        </strong>
      )
    })}
  </div>
}


const Odometer = ({ number }) => {
  useEffect(() => {
    requestAnimationFrame(animate)
    function animate() {
      const elems = document.getElementsByClassName('stepper');
      [...elems].forEach(function (e) {
        requestAnimationFrame(() => {
          const numToStop = e.dataset.num
          e.style.top = `-${20 * parseInt(numToStop)}px`
          e.style.tansitionDelay = `${100 * (10 - parseInt(numToStop))}`
        })
      })
    }

  })

  const nums = `${number}`.split("");
  return <div className="odometer">
    {nums.map(function (value, index) {
      return <Stepper key={index} num={value} />
    })}
  </div>
}


const ReactionIcon = (props) => {
  return (
    <Tooltip arrow title={`:${props.name}:`}>
      <div
        onClick={() => {
          if (props.onClick)
            props.onClick(props)
        }}
        style={{
          color: "rgb(107, 74, 252)",
          display: "flex",
          justifyContent: "center",
          alignContent: "center",
          alignItems: "center",
          padding: 3.5,
          gap: 5,
          minWidth: 45,
          cursor: "pointer",
          borderRadius: ".5rem",
          ...props.style,
        }}
      >
        <div
          style={{
            width: 19,
            height: 19,
            borderRadius: 5,
            backgroundPosition: "center",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundImage: `url(${props.url})`,
            ...props.style?.iconStyle,
          }}
        />
        {(props.count) && (
          <Odometer number={`${props.count}`} />
        )}
      </div>
    </Tooltip>
  )
}

export default ReactionIcon
