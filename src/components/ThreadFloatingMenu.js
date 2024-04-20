import { useState } from "react";
import { Tooltip } from "@mui/material";
import styles from "../styles/components/ThreadFloatingMenu.module.css";
import SvgReply from "../assets/svg/SvgReply";
import SvgReact from "../assets/svg/SvgReact";

export default function ThreadFloatingMenu(props) {
  const [focus, setFocus] = useState(null);
  const MENU_ACTIONS = [
    {
      icon: <SvgReply />,
      description: "Reply",
      method: props.onComment,
    },
    {
      icon: <SvgReact />,
      description: "React",
      method: props.onReact,
    },
  ];

  return (
    props.show && (
      <div className={styles.modalContainer}>
        {MENU_ACTIONS.map((x, k) => (
          <Tooltip key={k} title={x.description}>
            <div
              key={k}
              onClick={x.method}
              onMouseEnter={() => setFocus(() => k)}
              onMouseLeave={() => setFocus(() => null)}
              className={styles.modalItem}
              style={{
                boxShadow:
                  focus === k ? "rgb(228, 229, 231) 0px 0px 0px 1px" : "",
                background: focus === k ? "rgb(242, 242, 243)" : "",
              }}
            >
              {x.icon}
            </div>
          </Tooltip>
        ))}
      </div>
    )
  );
}
