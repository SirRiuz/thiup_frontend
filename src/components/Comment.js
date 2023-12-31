import useComment from "../hooks/useComment"
import Button from "./Button"
import DraftEditor from "./Editor"
import ProfileIcon from "./ProfileIcon"
import { useState } from "react"


const MAX_CHARACTER = 500

const CommentBox = props => {
  const [isLoad, setLoad] = useState(false)
  const [reset, setReset] = useState(false)
  const [focus, setFocus] = useState(false)
  const [text, setText] = useState("")
  const [data, setData] = useState("")
  const [files, _] = useState([])
  const { send } = useComment()
  const toSend = _ => {
    if (props.onSend !== undefined) {
      props.onSend()
    }

    send({
      files: files,
      thread: props.id,
      text: text,
      content: data
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
        flexDirection: 'column',
        gap: 12,
        justifyContent: 'flex-start',
        overflow: 'auto',
        // alignItems: focus || text.length > 0 ?
        //   'start' : 'center',
        ...props.style
      }}
    >
      {/* <div>
        <ProfileIcon iconSize={props.iconSize} />
      </div> */}
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
                setText(() => context.text !== undefined
                  ? context.text : "")

                setData(() => context.data)
              }}
              onBlur={() => {
                setFocus(() => false)
                if (props.onBlur !== undefined)
                  props.onBlur()
              }}
            />
          </div>
          {/* {(!focus && text.length <= 0) && (
            <Button
              placeholder={props.btnPlaceholder}
            />
          )} */}
        </div>
        <div
          style={{
            display: 'flex',
            justifyItems: 'center',
            alignContent: 'center',
            alignItems: 'center',
            gap: 13,
            justifyContent: 'flex-end',
            marginTop: focus || text.length > 0 ?
              14 : 0
          }}
        >
          {/* focus || text.length > 0 ? */}
          {true ? (
            <>
              <span
                style={{
                  color: (MAX_CHARACTER - text.length) < 0 ? 'red' : '#999999',
                  fontSize: 15,
                  fontWeight: 400,
                  fontStyle: 'normal',
                  display: ((MAX_CHARACTER - text.length) <= 50) ||
                    ((MAX_CHARACTER - text.length) <= 0) ? 'block' : 'none',
                }}
              >
                {MAX_CHARACTER - text.length}
              </span>
              <Button
                placeholder={props.btnPlaceholder}
                isFocus={(text.length > 0) &&
                  ((MAX_CHARACTER - text.length) >= 0)}

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
