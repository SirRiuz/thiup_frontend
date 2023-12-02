import * as React from "react"
const SvgReact = (props) => (
  <svg width={20} height={20} fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="rgba(0,0,0,.5)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M13.394 4.63a7.5 7.5 0 1 0 6.05 6.45M9 13.5s1.125 1.5 3 1.5 3-1.5 3-1.5"
      vectorEffect="non-scaling-stroke"
    />
    <path
      stroke="rgba(0,0,0,.5)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 9.75h.008m4.492 0h.008"
      vectorEffect="non-scaling-stroke"
    />
    <path
      stroke="rgba(0,0,0,.5)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M18.75 3v5.25m-2.625-2.625h5.25"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
)
export default SvgReact
