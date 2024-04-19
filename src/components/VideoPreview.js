import LazyLoadingBlock from "./LazyLoadingBlock";

export default function VideoPreview(props) {
  return (
    <LazyLoadingBlock
      styles={{
        position: "relative",
        ...props.styles,
      }}
    >
      <video
        autoPlay={true}
        loop={true}
        muted={props.muted}
        onClick={props.onClick}
        width={"100%"}
        height={"100%"}
        controlsList="nodownload nofullscreen"
        disablePictureInPicture
        controls={props.use_native_controls}
        style={{
          objectFit: "cover",
          background: "#EAEAEA",
          ...props.videoStyles,
        }}
      >
        <source src={props.data.file} type="video/mp4" />
      </video>
    </LazyLoadingBlock>
  );
}
