import { Tooltip } from "@mui/material"
import Modal from "@mui/material/Modal"
import Grid from "@mui/material/Grid"
import CommentBox from "./Comment"
import styles from "../styles/components/NewThreadModal.module.css"
import SvgClose from "../assets/svg/SvgClose"


const CloseButton = (props) => (
  <Tooltip title={"Close"}>
    <div
      className={styles.closeButton}
      onClick={props.onClose}
    >
      <SvgClose />
    </div>
  </Tooltip>
)

export default function NewThreadModal(props) {
  return (
    <Modal
      className={styles.modal}
      open={props.open}
    >
      <Grid
        className={styles.container}
        item
        lg={4}
        md={6}
        sm={9}
        xs={11}
      >
        <div className={styles.header}>
          <CloseButton onClose={props.onClose} />
        </div>
        <div className={styles.commentBoxContainer}>
          <CommentBox
            iconSize={43}
            btnPlaceholder={"Post"}
            placeholder={"Start a thread"}
            onComplete={props.onClose}
          />
        </div>
      </Grid>
    </Modal>
  )
}
