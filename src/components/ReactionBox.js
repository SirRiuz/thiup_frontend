import { useEffect, useState } from "react";
import useReaction from "../hooks/useReaction";
import ReactionIcon from "./ReactionIcon";
import "../styles/components/reactions.css";


const ReactionPreview = (props) => {
  const { react } = useReaction({});
  const [focus, setFocus] = useState(props.last);
  const [reactions, _] = useState(props.data);
  const [selected, setSelected] = useState(null);
  const isSelected = selected !== null ? reactions.some(
    (e) => e.id === selected.id) : false;

  const onSetReaction = (e) => {
    react({
      thread: props.thread,
      reaction: e.id
    });
    setFocus((i) => (!(i === e.id) ? e.id : null));
  };

  useEffect(() => {
    if (props.selectReaction !== null) {
      setSelected({ ...props.selectReaction, reaction_count: 0 });
      onSetReaction(props.selectReaction);
      props.onCompleteReaction();
    }
  }, [props.selectReaction]);

  const items = reactions.map((x, k) => {
    const cout =
      props.last === x.id
        ? x.id === focus
          ? x.reaction_count
          : x.reaction_count - 1
        : x.id === focus
          ? x.reaction_count + 1
          : x.reaction_count;

    return (
      cout >= 1 && (
        <ReactionIcon
          key={k}
          iconUrl={`${process.env.REACT_APP_API_URL}${x.icon}`}
          count={cout}
          style={{
            border:
              x.id === focus
                ? "solid 1.5px rgb(107, 74, 252)"
                : "1.5px solid rgb(218, 210, 254)",

            background:
              x.id === focus
                ? "rgba(107, 74, 252, .05)"
                : "rgba(248, 246, 255, 1)",
          }}
          onClick={() => {
            onSetReaction(x);
            setSelected(() => null);
          }}
        />
      )
    );
  });

  return reactions.length > 0 && (
    <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
      <div className="reaction-box-grup">
        {items}
        {selected !== null && selected.id === focus && !isSelected && (
          <ReactionIcon
            style={{ border: "solid 1.5px rgb(107, 74, 252)" }}
            onClick={() => onSetReaction(selected)}
            iconUrl={`${process.env.REACT_APP_API_URL}${selected.icon}`}
            count={
              selected.id === focus
                ? selected.reaction_count + 1
                : selected.reaction_count
            }
          />
        )}
      </div>
    </div>
  )
};

export default ReactionPreview;
