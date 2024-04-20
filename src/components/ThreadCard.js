import { Tooltip } from "@mui/material";
import { useState } from "react";
import ReactionBox from "./ReactionBox";
import ProfileIcon from "./ProfileIcon";
import TextPreview from "./TextPreview";
import ThreadFloatingMenu from "./ThreadFloatingMenu";
import styles from "../styles/components/ThreadCard.module.css";
import MediaLayout from "./MediaLayout";

export default function ThreadCard(props) {
  const [show, setShow] = useState(false);
  const [openReactMenu, setOpenReactMenu] = useState(false);
  const [reactions, setReactions] = useState(props.response.reactions.length);
  const [reaction_selected, setSelectedReaction] = useState(
    props.response.last_reaction
  );

  return (
    <div
      onClick={props.onClick}
      onMouseLeave={() => setShow(() => false)}
      onMouseEnter={() => setShow(() => true)}
      style={{ position: "relative", ...props.style }}
    >
      {props.useFloatingMenu && (
        <ThreadFloatingMenu
          show={show}
          onComment={props.onComment}
          onReact={() => setOpenReactMenu(() => true)}
        />
      )}

      <div className={styles.header}>
        <ProfileIcon
          flag={props.flag}
          iconSize={props.iconSize !== undefined ? props.iconSize : 30}
          url={props.response.mask?.miniature}
        />
        <div className={styles.headerItems}>
          {props.response.mask?.id && (
            <span
              className={styles.threadMask}
              style={{ ...props.titleHashStyles }}
            >
              {`0x${props.response.mask.id.substring(0, 10).replace("-", "")}`}
            </span>
          )}
          <span className={styles.threadDateInfo}>
            {props.response.create_at}
          </span>
          {props.showNewThread && props.response.is_new && (
            <span className={styles.newThreadIndicator}>NEW</span>
          )}
          {props.showOp && (
            <Tooltip arrow title="Thread creator">
              <span className={styles.opIndicator}>OP</span>
            </Tooltip>
          )}
        </div>
      </div>

      <div
        style={{
          fontSize: props.textFontSize !== undefined ? props.textFontSize : 15,
        }}
      >
        <TextPreview
          fontSize={props.textFontSize}
          search={props.search}
          data={props.response?.content}
        />
        {props.response?.media.length > 0 && (
          <MediaLayout data={props.response.media} styles={{ marginTop: 8 }} />
        )}
      </div>

      <div className={styles.footer}>
        <div
          style={{
            display: "flex",
            alignContent: "center",
            alignItems: "center",
            flex: 1,
            gap: reactions > 0 && props.repliesCount > 0 ? "5px" : "0px",
            marginTop: reactions > 0 || props.repliesCount >  0 ? 9 : 0,
          }}
        >
          <ReactionBox
            openModal={openReactMenu}
            thread={props.response.id}
            last_reaction={reaction_selected}
            reactions={props.response.reactions}
            enable={props.enableReactions}
            onCloseModal={() => setOpenReactMenu(false)}
            onReact={(reaction) => {
              setReactions((count) => reaction ? count + 1 : count - 1);
              setSelectedReaction(reaction);
              if(props.onChangeReaction) {
                props.onChangeReaction(reaction)
              }
            }}
          />
          {reactions > 0 && props.repliesCount > 0 && (
            <div className={styles.repliesCount}> · </div>
          )}
          <div className={styles.repliesContainerCount}>
            {props.repliesCount > 0 && (
              <span className={styles.repliesCount}>
                {props.repliesCount}{" "}
                {props.repliesCount > 1 ? "replies" : "reply"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
