import Popover from "@mui/material/Popover";
import useReaction from "../hooks/useReaction";

const MoreReactions = (props) => {
  const { reactions } = useReaction({ list: props.show });
  const onSetReaction = (e) => props.onSelect(e);

  return (
    <div>
      <Popover
        id="id"
        anchorEl={props.anchorEl}
        onClose={props.onClose}
        open={props.show}
        style={{ marginTop: 10 }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        Reactions
        {reactions.map((x, k) => (
          <div key={k} onClick={() => onSetReaction(x)}>
            {x.name}
          </div>
        ))}
      </Popover>
    </div>
  );
};

export default MoreReactions;
