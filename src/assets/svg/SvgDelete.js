import * as React from "react";
const SvgComponent = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={13}
    height={15}
    fill="none"
    {...props}
  >
    <path
      stroke="rgb(114, 117, 126)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.25}
      d="M1 3.5h11.25m-8.125 0V2.25A1.25 1.25 0 0 1 5.375 1h2.5a1.25 1.25 0 0 1 1.25 1.25V3.5m-3.75 3.125v3.75m2.5-3.75v3.75M11 3.5v8.75a1.25 1.25 0 0 1-1.25 1.25H3.5a1.25 1.25 0 0 1-1.25-1.25V3.5H11Z"
    />
  </svg>
);
export default SvgComponent;
