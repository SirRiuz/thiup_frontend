import { useEffect, useState } from "react";
import { createReactionService } from "../services/reaction";
import ReactionIcon from "./ReactionIcon";
import styles from "../styles/components/ReactionBox.module.css";
import ReactionModal from "./ReactionModal";

export default function ReactionBox(props) {
  const [reactions, _] = useState(props.reactions);
  const [selected, setSelected] = useState(props.last_reaction);
  const unusedReaction =
    reactions.filter((reaction) => reaction.id === selected?.id).length === 0;

  useEffect(() => {
    setSelected(() => props.last_reaction);
  }, [props.last_reaction]);

  const onReact = (reaction) => {
    createReactionService({
      reaction: reaction?.id,
      thread: props.thread,
    }).catch(() => {
      setSelected(() => null);
      props.onReact(null);
    });
    const current_reaction = reaction?.id === selected?.id ? null : reaction;
    reactions.map((r, k) => {
      if (r.id === current_reaction?.id) {
        r.reaction_count += 1;
      }
      return r;
    });

    setSelected((last_reaction) => {
      if (last_reaction) {
        var new_re = reactions.map((x, k) => {
          if (x.id === last_reaction.id) {
            x.reaction_count -= 1;
          }
          return x;
        });
        new_re = new_re.filter((reaction) => reaction.reaction_count >= 1);
      }
      return current_reaction;
    });
    console.log(current_reaction)
    props.onReact(current_reaction);
  };

  return (
    <div className={styles.container}>
      {reactions
        .filter((reaction) => reaction.reaction_count >= 1)
        .map((reaction, key) => (
          <ReactionIcon
            key={key}
            name={reaction.name}
            url={reaction.icon}
            count={reaction.reaction_count}
            onClick={(_) => {
              if (props.enable) {
                onReact(reaction);
              }
            }}
            style={{
              border:
                reaction.id === selected?.id
                  ? "solid .0625rem rgb(107, 74, 252)"
                  : ".0625rem solid rgba(235, 235, 235, 1.00)",

              background:
                reaction.id === selected?.id
                  ? "rgba(107, 74, 252, .05)"
                  : "#FCFCFD",
            }}
          />
        ))}
      {selected && unusedReaction && (
        <ReactionIcon
          count={1}
          onClick={() => onReact(selected)}
          name={selected.name}
          url={selected.icon}
          style={{
            border: "solid .0625rem rgb(107, 74, 252)",
            background: "rgba(107, 74, 252, .05)",
          }}
        />
      )}
      <ReactionModal
        show={props.openModal}
        last_reaction={selected?.id}
        onClose={props.onCloseModal}
        onSelect={(reaction) => {
          props.onCloseModal();
          onReact(reaction);
        }}
      />
    </div>
  );
}
