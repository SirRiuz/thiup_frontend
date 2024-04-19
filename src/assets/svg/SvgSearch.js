import * as React from "react";

const SvgSearch = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    {...props}
  >
    <circle
      cx={7.125}
      cy={7.125}
      r={6.125}
      stroke="rgba(201, 201, 201, .97)"
      strokeWidth={2}
    />
    <path
      stroke="rgba(201, 201, 201, .97)"
      strokeLinecap="round"
      strokeWidth={2}
      d="m15 15-2.625-2.625"
    />
  </svg>
);
export default SvgSearch;
