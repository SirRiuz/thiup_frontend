import { useRef, useState } from "react";
import { Tooltip } from "@mui/material";
import SvgFiles from "../assets/svg/SvgFiles";
import {
  getResolutionOfImageOrVideo,
  getPixelColorOfImage,
} from "../utils/files";

const FILE_MAX_SIZE = 20 * 1024 * 1024;

export default function FilePicker(props) {
  const hiddenFileInput = useRef(null);
  const handleClick = (event) => hiddenFileInput.current.click();

  const onSetFile = async (e) => {
    if (e.target.files.length >= 1) {
      const file = e.target.files[0];
      const is_video = file.type.startsWith("video");
      const resolution = await getResolutionOfImageOrVideo(file);
      var pixelColor = is_video ? "#161c1e" : await getPixelColorOfImage(file);
      encodeFile(file, (data) => {
        props.onSelectedFile({
          data: data,
          type: file.type,
          name: file.name,
          size: file.size,
          resolution: resolution,
          target_color: pixelColor,
          is_video: is_video,
        });
      });
    }
  };

  const encodeFile = (file, callback) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const fileContent = event.target.result;
      const base64Content = btoa(fileContent);
      if (file.size > FILE_MAX_SIZE) {
        alert("The file is too large!! It exceeds the 20 MB limit.");
        return;
      }
      callback(base64Content);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Tooltip title={!props.disabled ? "Attach file" : null}>
      <div>
        <div>
          <div
            onClick={handleClick}
            style={{
              display: "flex",
              justifyContent: "center",
              alignContent: "center",
              alignItems: "center",
              cursor: props.disabled ? "default" : "pointer",
            }}
          >
            <SvgFiles />
          </div>
          <input
            ref={hiddenFileInput}
            disabled={props.disabled}
            onChange={onSetFile}
            type="file"
            accept="jpg, .jpeg, .png, .mp4"
            style={{ display: "none" }}
          />
        </div>
      </div>
    </Tooltip>
  );
}
