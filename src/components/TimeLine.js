import { useState } from "react"
import CommentBox from "./Comment"
import Separator from "./Separator"
import ThreadCard from "./ThreadCard"
import Flag from "react-world-flags"


function ThreadResponses(props) {
  const [focus, setFocus] = useState(false)
  return (
    props.responses.length > 0 && (
      <div
        style={{
          borderRadius: 11,
          border: "solid 1px rgba(235, 235, 235, 1.00)",
          margin: "10px 16px 20px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {props.responses
          .filter(x => x)
          .map((x, k) => (
            <div key={k}>
              <ThreadCard
                reactionable={true}
                response={x}
                useFloatingMenu={true}
                iconSize={23}
                showNewThread={true}
                onComment={() => setFocus((e) => !e)}
                flag={
                  <Flag
                    code={"col"}
                    height="8.5"
                    frameBorder={10}
                    style={{ borderRadius: 3.1192 }}
                  />
                }
                style={{
                  padding: "16px 16px 15px",
                  color: "#2e2f33",
                  borderRadius: k === 0 ? "10px 10px 0px 0px" : "0px",
                }}
              />
              {!(k === props.responses.length - 1) && <Separator />}
            </div>
          ))}
        <div
          style={{
            width: "100%",
            background: "rgb(252, 252, 253)",
            borderRadius: "0px 0px 11px 11px",
            borderTop: "solid 1px rgba(235, 235, 235, 1.00)",
          }}
        >
          <CommentBox
            id={props.parent}
            focus={focus || props.focusBox}
            onComplete={(e) => props.onResponse(e)}
            onBlur={() => {
              setFocus((_) => false)
              if (props.onBlur !== undefined) props.onBlur()
            }}
          />
        </div>
      </div>
    )
  )
}


function ThreadResponseContent(props) {
  const [show, setShow] = useState(false)
  const [focus, setFocus] = useState(false)
  const [responses, setResponses] = useState(props.data.responses)
  return (
    <>
      <ThreadCard
        reactionable={true}
        response={props.data}
        showNewThread={true}
        useFloatingMenu={true}
        flag={
          <Flag
            code={"col"}
            height="9"
            frameBorder={10}
            style={{ borderRadius: 3.1192 }}
          />
        }
        onComment={() => {
          if (responses.length <= 0) {
            setShow((e) => !e)
          } else {
            setFocus(() => true)
          }
        }}
        style={{
          padding: `20px 20px ${responses?.length > 0 ? "0px" : "20px"}`,
          backgroundColor: "white",
          color: "#2e2f33",
          ...props.cardStyle,
        }}
      />
      <ThreadResponses
        parent={props.data.id}
        focusBox={focus}
        responses={responses}
        onBlur={() => setFocus(() => false)}
        onResponse={(e) => setResponses(() => [...responses, e])}
      />
      {responses.length <= 0 && show && (
        <div
          style={{
            paddingLeft: 20,
            paddingRight: 20,
            marginBottom: 17,
          }}
        >
          <div
            style={{
              background: "rgb(252, 252, 253)",
              border: "solid 1px rgba(235, 235, 235, 1.00)",
              borderRadius: 11
            }}
          >
            <CommentBox
              btnPlaceholder="Reply"
              style={{ paddingTop: 8, paddingBottom: 8 }}
              id={props.data.id}
              onComplete={(e) => setResponses(() => [...responses, e])}
            />
          </div>
        </div>
      )}
      <Separator />
    </>
  )
}


export default function TimeLine(props) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {props.responses
        .filter(x => x)
        .map((x, k) => (
          <ThreadResponseContent
            data={x}
            key={k}
            cardStyle={{
              borderRadius: k === 0 ? "10px 10px 0px 0px" : "0px",
            }}
          />
        ))}
    </div>
  )
}
