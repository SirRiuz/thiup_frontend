import useComment from "../hooks/useComment"
import DraftEditor from "./Editor"
import ProfileIcon from "./ProfileIcon"
import { RotatingLines } from 'react-loader-spinner'
import { useState } from "react"
import FilePicker from "./FilePicker"

const SendButton = props => {
  const onClick = _ => {
    if (props.isFocus && props.onClick
      !== undefined &&
      !props.isLoad)
      props.onClick()
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "rgb(107, 74, 252)",
        borderRadius: 5.77148,
        boxShadow: `rgba(107, 74, 252, 0.12) 
                    0px 0px 0px 1px, rgba(107, 74, 252, 0.4) 0px 
                    2px 8px, rgba(107, 74, 252, 0.12) 0px 2px 4px`,
        color: "rgb(239, 239, 241)",
        height: 32,
        paddingLeft: 10,
        paddingRight: 10,
        cursor: props.isFocus && !props.isLoad ?
          "pointer" : "auto",
        opacity: props.isFocus ? 1 : 0.5,
        ...props.style
      }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}
      >
        {props.isLoad ? (<RotatingLines
          strokeColor="white"
          strokeWidth="5"
          animationDuration="0.75"
          width="15"
          visible={true}
        />) : "Comment"}
      </span>
    </div>
  )
}

const CommentBox = props => {
  const [isLoad, setLoad] = useState(false)
  const [reset, setReset] = useState(false)
  const [focus, setFocus] = useState(false)
  const [text, setText] = useState("")
  const [files, setFile] = useState([])
  const { send } = useComment()
  const toSend = _ => {
    if (props.onSend !== undefined) { props.onSend() }
    send({
      files: files,
      thread: props.id,
      text: text
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
        alignItems: focus || text.length > 0 ? 'start' : 'center',
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
              onChange={(e) => setText(() => e)}
              onBlur={() => {
                setFocus(() => false)
                if (props.onBlur !== undefined)
                  props.onBlur()
              }}
            />
          </div>
          <FilePicker
            style={{
              visibility: (!focus && text.length <= 0)
                ? 'visible' : 'hidden'
            }}
          />
          <SendButton
            style={{
              visibility: (!focus && text.length <= 0)
                ? 'visible' : 'hidden'
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: focus || text.length > 0 ? 14 : 0
          }}
        >
          {focus || text.length > 0 ? (
            <>
              <FilePicker
                onChange={(files) => {
                  setFile(() => files)
                }}
              />
              <SendButton
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
