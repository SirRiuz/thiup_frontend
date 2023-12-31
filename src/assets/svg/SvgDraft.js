import * as React from "react"
const SvgDreaft = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={14}
    height={17}
    fill="none"
    {...props}
  >
    <path
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M7.75 1H2.5A1.5 1.5 0 0 0 1 2.5v12A1.5 1.5 0 0 0 2.5 16h9a1.5 1.5 0 0 0 1.5-1.5V6.25L7.75 1Z"
    />
    <path
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M7.75 1v5.25H13"
    />
  </svg>
)
export default SvgDreaft
