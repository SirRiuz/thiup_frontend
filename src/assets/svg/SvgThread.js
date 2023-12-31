import * as React from "react"
const SvgThread = (props) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={21}
      height={11}
      fill="none"
      {...props}
    >
      <rect
        width={4}
        height={4}
        x={5}
        y={6}
        stroke="#000"
        strokeWidth={1.5}
        rx={2}
        transform="rotate(90 5 6)"
      />
      <rect
        width={4}
        height={4}
        x={16}
        y={5}
        stroke="#000"
        strokeWidth={1.5}
        rx={2}
        transform="rotate(-90 16 5)"
      />
      <path
        stroke="#000"
        strokeWidth={1.5}
        d="m17 4-1.5 1.5c-1.017 1.017-1.526 1.526-2.137 1.638a2 2 0 0 1-.726 0c-.611-.112-1.12-.62-2.137-1.638-1.017-1.017-1.526-1.526-2.137-1.638a2 2 0 0 0-.726 0c-.611.112-1.12.62-2.137 1.638L4 7"
      />
    </svg>
  )


export default SvgThread
