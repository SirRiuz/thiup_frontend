import handleViewport from "react-in-viewport";

const Block = (props) => {
  const { inViewport, forwardedRef } = props;
  return (
    <div
      ref={forwardedRef}
      style={{
        ...props.styles,
      }}
    >
      {inViewport && props.children}
    </div>
  );
};

const LazyLoadingBlock = handleViewport(Block);

export default LazyLoadingBlock;
