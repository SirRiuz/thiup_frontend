import { useState } from "react"
import ReactionBox from "./ReactionBox"
import ProfileIcon from "./ProfileIcon"
import TextPreview from "./TextPreview"
import ThreadFloatingMenu from "./ThreadFloatingMenu"
import styles from "../styles/components/ThreadCard.module.css"
import MediaLayout from "./MediaLayout"


export default function ThreadCard(props) {
  const [show, setShow] = useState(false)
  const [openReactMenu, setOpenReactMenu] = useState(false)
  const [reaction, setSelectedReaction] = useState(props.response.last_reaction)

  const onClick = props => {
    if (props.onClick)
      props.onClick()
  }

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
          iconSize={props.iconSize !== undefined ?
            props.iconSize : 30}
        />
        <div className={styles.headerItems}>
          {props.response.mask && (
            <span
              className={styles.threadMask}
              style={{ ...props.titleHashStyles }}
            >
              0x{props.response.mask.id.substring(0, 10).replace("-", "")}
            </span>
          )}
          <span className={styles.threadDateInfo}>
            {props.response.create_at}
          </span>
          {props.showNewThread && props.response.is_new && (
            <span className={styles.newThreadIndicator}>
              NEW
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          fontSize: props.textFontSize !== undefined ?
            props.textFontSize : 15
        }}
      >
        <TextPreview
          fontSize={props.textFontSize}
          search={props.search}
          data={props.response?.content}
        />

        {props.response?.media && (
          <MediaLayout data={props.response.media} />
        )}

      </div>
      <div className={styles.footer}>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignContent: "center",
            alignItems: "center",
            gap: props.response.reactions.length > 0 &&
              props.repliesCount ? "8px" : "0px",

            marginTop: props.response.reactions.length > 0 ||
              props.response.responses_count > 0 ? 10 : 0,
          }}
        >
          <ReactionBox
            openModal={openReactMenu}
            onCloseModal={() => { setOpenReactMenu(() => false) }}
            reactionable={props.reactionable}
            thread={props.response.id}
            last_reaction={reaction}
            reactions={props.response.reactions}
            onReact={(reaction) => setSelectedReaction(reaction)}
          />

          {props.response.reactions.length > 0 && props.repliesCount > 0 && (
            <div className={styles.repliesCount}> · </div>
          )}
          <div className={styles.repliesContainerCount}>
            {props.repliesCount > 0 && (
              <span className={styles.repliesCount}>
                {props.repliesCount} {(props.repliesCount > 1) ? "replies" : "reply"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
