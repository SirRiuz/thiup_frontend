import { useEffect, useState } from "react";
import { Tooltip } from "@mui/material";
import Separator from "../components/Separator";
import SvgComponent from "../assets/svg/SvgDelete";
import SvgImage from "../assets/svg/SvgImage";

const MAX_TITLE_SIZE = 28;

export default function MediaSelectedPreview(props) {
  const [media, setMedia] = useState(props.media);
  const onDelete = (k) => media.filter((el) => el !== media[k]);

  useEffect(() => {
    setMedia(() => props.media);
  }, [props.media]);

  return (
    media.length >= 1 && (
      <div
        style={{
          marginTop: 20,
          marginBottom: 15,
          fontSize: 13,
          fontWeight: 500,
          borderRadius: "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
          boxShadow:
            "rgba(0, 0, 0, 0.04) 0px 0px 0px 1px, rgba(0, 0, 0, 0.08) 0px 2px 8px, rgba(255, 255, 255, 0.08) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.04) 0px 0px 0px 4px",
        }}
      >
        {media.map((file, k) => (
          <>
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                height: 36,
                paddingLeft: 15,
                paddingRight: 15,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 11,
                  justifyContent: "center",
                  alignContent: "center",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignContent: "center",
                    alignItems: "center",
                  }}
                >
                  <SvgImage></SvgImage>
                </div>
                <div>
                  {file.name.substring(0, MAX_TITLE_SIZE)}
                  {file.name.length >= MAX_TITLE_SIZE ? "..." : ""}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 17,
                  justifyContent: "center",
                  alignContent: "center",
                  alignItems: "center",
                  color: "rgb(114, 117, 126)",
                }}
              >
                <div>{(file.size / 1024 ** 2).toFixed(2)} MB</div>
                <Tooltip title="Delete item">
                  <div
                    onClick={() => props.onDropItem(onDelete(k))}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <SvgComponent />
                  </div>
                </Tooltip>
              </div>
            </div>
            {!(k === media.length - 1) ? <Separator /> : null}
          </>
        ))}
      </div>
    )
  );
}
