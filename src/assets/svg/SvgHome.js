import * as React from "react"
const SvgHome = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={18}
    fill="none"
    {...props}
  >
    <path
      stroke="#000"
      strokeWidth={1.5}
      d="M1 8.76c0-1.358 0-2.037.274-2.634.275-.597.79-1.038 1.821-1.922l1-.857C5.96 1.75 6.89.95 8 .95c1.11 0 2.041.799 3.905 2.396l1 .857c1.03.884 1.546 1.325 1.82 1.922C15 6.723 15 7.402 15 8.76V13c0 1.886 0 2.828-.586 3.414C13.828 17 12.886 17 11 17H5c-1.886 0-2.828 0-3.414-.586C1 15.828 1 14.886 1 13V8.76Z"
    />
    <path
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M10.5 17v-5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v5"
    />
  </svg>
)
export default SvgHome
