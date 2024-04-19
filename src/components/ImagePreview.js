import { useState } from "react";
import LazyLoadingBlock from "./LazyLoadingBlock";

export default function ImagePreview(props) {
  const [isLoading, setLoad] = useState(true);
  return (
    <LazyLoadingBlock
      styles={{
        ...props.styles,
        border: "solid 0px white",
        position: "relative",
      }}
    >
      {isLoading && (
        <div
          style={{
            left: 0,
            right: 0,
            background: "#EAEAEA",
            position: "absolute",
            width: "100%",
            height: "100%",
            ...props.styles,
          }}
        />
      )}
      <picture>
        <img
          lazy={"true"}
          onClick={props.onClick}
          onLoad={() => setLoad(() => false)}
          onError={() => {setLoad(() => true)}}
          src={props.data.file}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 50%",
            borderRadius: 16,
            cursor: "pointer",
            ...props.styles,
          }}
        />
      </picture>
    </LazyLoadingBlock>
  );
}
