import Modal from "@mui/material/Modal"
import Grid from "@mui/material/Grid"
import MediaItem from "./MediaItem"
import styles from "../styles/components/MediaModalPreview.module.css"
import SvgClose from "../assets/svg/SvgClose"
import { Tooltip } from "@mui/material"


const CloseButton = (props) => (
  <Tooltip title={"Close"}>
    <div className={styles.closeButton} onClick={props.onClose}>
      <SvgClose />
    </div>
  </Tooltip>
)

export default function MediaModalPreview(props) {
  return (
    <Modal
      open={props.data !== null}
      onClose={props.onClose}
      className={styles.modal}
    >
      <Grid
        item
        lg={5}
        md={8}
        sm={8}
        xs={11}
        className={styles.container}
      >
        <div className={styles.header}>
          <CloseButton onClose={props.onClose} />
        </div>
        <MediaItem
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          styles={{ height: "100%", flex: 1, cursor: "default", borderRadius: 0 }}
        />
      </Grid>
    </Modal>
  )
}
