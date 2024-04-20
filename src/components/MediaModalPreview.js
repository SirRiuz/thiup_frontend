import { Tooltip } from "@mui/material";
import { hexToRGBA } from "../utils/files";
import Modal from "@mui/material/Modal";
import Grid from "@mui/material/Grid";
import MediaItem from "./MediaItem";
import styles from "../styles/components/MediaModalPreview.module.css";
import SvgClose from "../assets/svg/SvgClose";

const CloseButton = (props) => (
  <Tooltip title={"Close"}>
    <div className={styles.closeButton} onClick={props.onClose}>
      <SvgClose />
    </div>
  </Tooltip>
);

export default function MediaModalPreview(props) {
  return (
    <Modal
      open={props.data !== null}
      onClose={props.onClose}
      className={styles.modal}
      hideBackdrop={false}
      style={{
        background: props.data?.target_color
          ? hexToRGBA(props.data?.target_color, 0.7)
          : " background: rgba(22, 28, 30, 7)",
      }}
    >
      <Grid item lg={5} md={8} sm={8} xs={11} className={styles.container}>
        <div className={styles.header}>
          <CloseButton onClose={props.onClose} />
        </div>
        <MediaItem
          data={props.data}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          config={{
            video: {
              use_native_controls: true,
              muted: false,
              videoStyles: {
                objectFit: "contain",
              },
            },
          }}
          styles={{
            flex: 1,
            height: "95vh",
            cursor: "default",
            borderRadius: 0,
            objectFit: "contain",
          }}
          image={{
            objectFit: "cover",
            height: "auto",
          }}
        />
      </Grid>
    </Modal>
  );
}
