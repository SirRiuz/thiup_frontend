import { useRef, useState } from "react"
import MoreReactions from "./MoreReactions"
import useReaction from "../hooks/useReaction"
import "../styles/components/reactions.css"


const ReactionsBox = props => {
  const { react } = useReaction({})
  const [focus, setFocus] = useState(props.last)
  const [show, setShow] = useState(false)
  const [reactions, _] = useState(props.data)
  const [selected, setSelected] = useState(null)
  const anchorEl = useRef(null)
  const isSelected = selected !== null  ? reactions.some(
    e => e.id === selected.id):false

  const onSetReaction = e => {
    react({
      thread: props.thread,
      reaction: e.id})
    setFocus(
      (i) => !(i === e.id) ? e.id:null)
  }

  const items = reactions.map((x, k) => {
    const cout = (props.last === x.id ?
      (x.id === focus) ? (x.reaction_count):
        x.reaction_count - 1:(x.id === focus) ?
          (x.reaction_count + 1):
            x.reaction_count)


    if(cout >= 1)
      return (
        <div
          key={k}
          className="reaction-item"
          onClick={() => {
            onSetReaction(x)
            setSelected(() => null)}}
          style={{
            border: x.id === focus ?
              "solid 1.5px green":""}}
        >
          <div
            className="reaction-icon"
            style={{
              backgroundImage: `url(${process.env.REACT_APP_API_URL}${x.icon})`}}
          />
          <div>
            <strong className="reactions-counter">{cout}</strong>
          </div>
        </div>
      )
  })

  return(
    <div style={{display: 'flex', gap:10}}>
      <div className="reaction-box-grup">
        {items}
        {((selected !== null) && (
          selected.id === focus) && (
            !isSelected)) ? (
          <div
            onClick={() => onSetReaction(selected)}
            className="reaction-item"
            style={{
              border: selected.id === focus ?
                "solid 1.5px green":""}}
          >
            <div
              className="reaction-icon"
              style={{
                backgroundImage: `url(${process.env.REACT_APP_API_URL}${selected.icon})`}}
            />
            <div>
              <strong className="reactions-counter">
                {(selected.id === focus) ?
                  (selected.reaction_count + 1):
                    selected.reaction_count}
              </strong>
            </div>
          </div>
        ):null}
      </div>

      {/* <button
        ref={anchorEl}
        onClick={(e) => setShow((e) => !e)}
      >
        [ X ]
      </button> */}
      
      <MoreReactions
        show={show}
        anchorEl={anchorEl.current}
        onSelect={(e) => {
          setSelected({...e, reaction_count:0})
          onSetReaction(e)
          setShow((e) => !e)
        }}
        onClose={() => setShow((e) => !e)}
      />
    </div>
  )
}

export default ReactionsBox
