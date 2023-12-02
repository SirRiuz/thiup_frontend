import useComment from "../hooks/useComment"
import Button from "./Button"
import DraftEditor from "./Editor"
import ProfileIcon from "./ProfileIcon"
import { useState } from "react"


const CommentBox = props => {
  const [isLoad, setLoad] = useState(false)
  const [reset, setReset] = useState(false)
  const [focus, setFocus] = useState(false)
  const [text, setText] = useState("")
  const [data, setData] = useState("")
  const [files, _] = useState([])
  const { send } = useComment()
  const toSend = _ => {
    if (props.onSend !== undefined)
      props.onSend()

    send({
      files: files,
      thread: props.id,
      text: data
    }, (e) => {
      setLoad(() => false)
      setReset(() => true)
      props.onComplete(e)
    })
  }

  return (
    <div
      style={{
        padding: '10px 16px 10px',
        display: 'flex',
        gap: 12,
        justifyContent: 'flex-start',
        overflow: 'auto',
        alignItems: focus || text.length > 0 ?
          'start' : 'center',
        ...props.style
      }}
    >
      <ProfileIcon iconSize={props.iconSize} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1 }}>
            <DraftEditor
              reset={reset}
              focus={props.focus}
              placeholder={props.placeholder}
              onFocus={() => setFocus(() => true)}
              onReset={() => setReset(() => false)}
              onChange={(context) => {
                setText(() => context.text !== undefined ? context.text : "")
                setData(() => context.data)
              }}
              onBlur={() => {
                setFocus(() => false)
                if (props.onBlur !== undefined)
                  props.onBlur()
              }}
            />
          </div>
          {(!focus && text.length <= 0) && (
            <Button
              placeholder={props.btnPlaceholder}
            />
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: focus || text.length > 0 ?
              14 : 0
          }}
        >
          {focus || text.length > 0 ? (
            <>
              <Button
                placeholder={props.btnPlaceholder}
                isFocus={text.length > 0}
                isLoad={isLoad}
                onClick={() => {
                  setLoad(() => true)
                  toSend()
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default CommentBox
