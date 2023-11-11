import { useState } from "react"
import CommentBox from "./Comment"
import Media from "../components/Media"
import ReactionsBox from "./ReactionBox"
import Separator from "./Separator"
import ProfileIcon from "./ProfileIcon"
import "../styles/threads.css"
import MediaSwiper from "./Swiper"


const Response = props => {
  return (
    <div
      className="response"
      style={{ ...props.style }}
      onClick={() => {
        if (props.onClick !== undefined)
          props.onClick()
      }}
    >
      <div className="response-content">
        <div className="meta-thread">
          <ProfileIcon
            iconSize={props.iconSize !== undefined ?
              props.iconSize : 30}
          />
          <div
            style={{
              display: 'flex',
              gap: 4,
              alignItems: 'center',
              alignContent: 'center',
            }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: '#2a251d',
                fontStyle: 'normal',
                fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI",
                            Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans",
                            "Helvetica Neue", sans-serif`,
                ...props.titleHashStyles
              }}
            >
              0x1b2f1
            </span>
            <span className="thread-date">16h</span>
          </div>
        </div>
        <div>
          <span
            style={{
              fontFamily: `-apple-system, BlinkMacSystemFont,
                          "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, 
                          "Open Sans", "Helvetica Neue", sans-serif`,
              fontSize: 15,
              fontWeight: 400,
              fontStyle: 'normal',
              color: '#2a251d'
            }}
          >
            {props.response.text}
          </span>
          <div>
            <MediaSwiper>
              {props.response.media.map((x, k) => <Media url={x.file} />)}
            </MediaSwiper>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            color: "rgba(0, 0, 0, .8)",
            gap: 10,
            marginBottom: 10
          }}
        >
          <ReactionsBox
            last={props.response.last_reaction}
            thread={props.response.id}
            data={props.response.reactions}
          />
        </div>
      </div>
    </div>
  )
}

const ThreadResponses = props => {
  const [focus, setFocus] = useState(false)
  return props.responses.length > 0 && (
    <div
      style={{
        borderRadius: 11,
        border: 'solid 1.5px #e7e7e8',
        margin: '10px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {props.responses.map((x, _) => (
        <div>
          <Response
            subcomment={true}
            parent={x.parent}
            response={x}
            iconSize={23}
            onClick={() => setFocus((e) => !e)}
            titleHashStyles={{ fontSize: 13 }}
            style={{ padding: '16px 16px 5px' }}
          />
          <Separator />
        </div>
      ))}
      <div
        style={{
          width: '100%',
          background: '#F7F7F8',
          borderRadius: '0px 0px 11px 11px',
        }}
      >
        <CommentBox
          id={props.parent}
          focus={focus || props.focusBox}
          onComplete={(e) => props.onResponse(e)}
          onBlur={() => {
            setFocus((e) => false)
            if (props.onBlur !== undefined)
              props.onBlur()
          }}
        />
      </div>
    </div>
  )
}

const ThreadResponseContent = props => {
  const [show, setShow] = useState(false)
  const [focus, setFocus] = useState(false)
  const [responses, setResponses] = useState(props.data.responses)
  return (
    <>
      <Response
        style={{ padding: '24px 24px 0px' }}
        parent={props.data.parent}
        response={props.data}
        onClick={() => {
          if (responses.length <= 0) {
            setShow(e => !e)
          } else {
            setFocus(() => true)
          }
        }}
      />
      <ThreadResponses
        parent={props.data.id}
        focusBox={focus}
        responses={responses}
        onBlur={() => setFocus(() => false)}
        onResponse={(e) => {
          setResponses(() => [...responses, e.data])
        }}
      />
      <Separator />
      <div style={{ background: 'red' }}>
        {responses.length <= 0 && show ? (
          <CommentBox
            id={props.data.id}
            onComplete={(e) => {
              setResponses(() => [...responses, e.data])
            }}
          />
        ) : null}
      </div>
    </>
  )
}

const TimeLine = props => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {props.responses.map((x, k) => (
        <ThreadResponseContent data={x} />
      ))}
    </div>
  )
}

export default TimeLine
