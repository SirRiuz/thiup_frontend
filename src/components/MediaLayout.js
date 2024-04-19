import { isSingle, parseArray } from "../utils/arrays";
import { useState } from "react";
import styles from "../styles/components/MediaLayout.module.css";
import MediaItem from "./MediaItem";
import MediaModalPreview from "./MediaModalPreview";

const calculateMediaItemStyles = (i, l) => ({
  flex: 1,
  ...(i.length > 1
    ? {
        borderTopLeftRadius: i.length > 1 && l === 0 ? 16 : 0,
        borderBottomLeftRadius: i.length > 1 && l === 0 ? 16 : 0,
        borderTopRightRadius: i.length > 1 && l === i.length - 1 ? 16 : 0,
        borderBottomRightRadius: i.length > 1 && l === i.length - 1 ? 16 : 0,
      }
    : {
        borderRadius: 16,
      }),
});

const calculateMediaItemSize = (width) => {
  if ((width >= 530 && width < 640) || (width >= 0 && width < 530)) {
    return {
      maxWidth: 241,
      height: 430,
    };
  } else if ((width >= 640 && width < 700) || (width >= 700 && width < 760)) {
    return {
      maxWidth: 430,
      height: 430,
    };
  } else if (width >= 760 && width < 1085) {
    return {
      maxWidth: 530,
      height: 430,
    };
  } else if (width >= 1085 && width < 2035) {
    return {
      maxWidth: 346,
      height: 430,
    };
  } else if (width >= 2035 && width < 4050) {
    return {
      maxWidth: "100%",
      height: 430,
    };
  }
};

export default function MediaLayout(props) {
  const [data, setData] = useState(null);
  var mediaList = null;
  if (!isSingle(props.data)) {
    mediaList = parseArray(props.data).map((i, k) => (
      <div className={styles.multiMedia} key={k}>
        {i.map((z, l) => (
          <MediaItem
            key={l}
            data={z}
            styles={{
              backgroundSize: "cover",
              border: "solid 1px rgba(235, 235, 235, 1)",
              height: 345,
              ...calculateMediaItemStyles(i, l),
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setData(() => z);
            }}
          />
        ))}
      </div>
    ));
  } else {
    mediaList = (
      <MediaItem
        data={props.data[0]}
        styles={{
          borderRadius: 16,
          border: "solid 1px rgba(235, 235, 235, 1)",
          backgroundSize: "cover",
          ...calculateMediaItemSize(props.data[0].width),
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setData(() => props.data[0]);
        }}
      />
    );
  }
  return (
    <div className={styles.mediaLayoutContainer} style={{ ...props.styles }}>
      {mediaList}
      <MediaModalPreview
        data={data}
        onClose={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setData(() => null);
        }}
      />
    </div>
  );
}
