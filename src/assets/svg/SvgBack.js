import * as React from "react";
const SvgBack = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <path
      fill="rgba(46, 47, 51, .85)"
      d="m4 12-.707-.707-.707.707.707.707L4 12Zm15 1a1 1 0 1 0 0-2v2ZM9.293 5.293l-6 6 1.414 1.414 6-6-1.414-1.414Zm-6 7.414 6 6 1.414-1.414-6-6-1.414 1.414ZM4 13h15v-2H4v2Z"
    />
  </svg>
);
export default SvgBack;
