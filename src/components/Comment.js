import { Snackbar } from "@mui/material"
import { useState } from "react"
import { commentService } from "../services/thread"
import styles from "../styles/components/Comment.module.css"
import Button from "./Button"
import DraftEditor from "./Editor"
import FilePicker from "./FilePicker"


const MAX_CHARACTER = 500

export default function CommentBox(props) {
  const [showError, setShowError] = useState(false)
  const [isLoad, _] = useState(false)
  const [reset, setReset] = useState(false)
  const [focus, setFocus] = useState(false)
  const [media, setMedia] = useState([])
  const [text, setText] = useState("")
  const [content, setContent] = useState("")

  const onComment = e => {
    if (props.onComplete) {
      props.onComplete(e)
    }
  }

  const onCreateThread = _ => {
    setReset(() => true)
    setMedia(() => [])
    onComment(
      {
        "content": content,
        "text": text,
        "responses": [],
        "reactions": [],
        "create_at": "loading ...",
      }
    )

    commentService({
      media: media,
      thread: props.id,
      text: text,
      content: content
    })
      .then(({ data }) => onComment(data))
      .catch(() => {
        onComment(null)
        setShowError(() => true)
      })
  }

  return (
    <div
      className={styles.container}
      style={{ ...props.style }}
    >
      <div style={{ flex: 1 }}>
        <div className={styles.inputContainer}>
          <div style={{ flex: 1 }}>
            <DraftEditor
              reset={reset}
              focus={props.focus}
              placeholder={props.placeholder}
              onFocus={() => setFocus(() => true)}
              onReset={() => setReset(() => false)}
              onChange={(context) => {
                setContent(() => context.data)
                setText(() => context.text !== undefined
                  ? context.text : "")
              }}
              onBlur={() => {
                setFocus(() => false)
                if (props.onBlur !== undefined)
                  props.onBlur()
              }}
            />
          </div>
        </div>
        <div className={styles.commentOptions}>
          <span
            className={styles.limitSizeText}
            style={{
              color: (MAX_CHARACTER - text.length) < 0 ? 'red' : '#999999',
              display: ((MAX_CHARACTER - text.length) <= 50) ||
                ((MAX_CHARACTER - text.length) <= 0) ? 'block' : 'none',
            }}
          >
            {MAX_CHARACTER - text.length}
          </span>
          <FilePicker onChange={(data) => setMedia(() => data)}/>
          <Button
            isLoad={isLoad}
            placeholder={props.btnPlaceholder}
            onClick={onCreateThread}
            isFocus={(text.length > 0) && ((
              MAX_CHARACTER - text.length) >= 0)}
          />
        </div>
      </div>

      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={showError}
        autoHideDuration={2000}
        onClose={() => setShowError(false)}
        message="An error occurred while processing the request."
      />
    </div>
  )
}
