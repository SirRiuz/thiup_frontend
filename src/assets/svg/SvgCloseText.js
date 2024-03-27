import * as React from "react"
const SvgCloseText = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <circle cx={10} cy={10} r={9} stroke="rgba(201, 201, 201, .95)" strokeWidth={2} />
    <path stroke="rgba(201, 201, 201, .95)" strokeWidth={2} d="m7 13 6-6M13 13 7 7" />
  </svg>
)
export default SvgCloseText
