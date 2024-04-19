import ImagePreview from "./ImagePreview";
import VideoPreview from "./VideoPreview";

export default function MediaItem(props) {
  return (
    <div
      style={{
        ...props.styles,
        border: "solid 0px white",
      }}
    >
      {props.data.is_video ? (
        <VideoPreview
          {...props.config?.video}
          muted={true}
          data={props.data}
          onClick={props.onClick}
          styles={{
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            ...props.styles,
          }}
        />
      ) : (
        <ImagePreview
          data={props.data}
          onClick={props.onClick}
          styles={props.styles}
        />
      )}
    </div>
  );
}
