import { RichUtils } from "draft-js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faChevronDown,
  faChevronUp,
  faCode,
  faHighlighter,
  faItalic,
  faListOl,
  faListUl,
  faStrikethrough,
  faSubscript,
  faSuperscript,
  faTextWidth,
  faUnderline,
} from "@fortawesome/free-solid-svg-icons";
import React from "react";
import styles from "../styles/components/FloatingToolbar.module.css";

const tools = [
  {
    label: "bold",
    style: "BOLD",
    icon: <FontAwesomeIcon icon={faBold} />,
    method: "inline",
  },
  {
    label: "italic",
    style: "ITALIC",
    icon: <FontAwesomeIcon icon={faItalic} />,
    method: "inline",
  },
  {
    label: "underline",
    style: "UNDERLINE",
    icon: <FontAwesomeIcon icon={faUnderline} />,
    method: "inline",
  },
  {
    label: "highlight",
    style: "HIGHLIGHT",
    icon: <FontAwesomeIcon icon={faHighlighter} />,
    method: "inline",
  },
  {
    label: "strike-through",
    style: "STRIKETHROUGH",
    icon: <FontAwesomeIcon icon={faStrikethrough} />,
    method: "inline",
  },
  {
    label: "Superscript",
    style: "SUPERSCRIPT",
    icon: <FontAwesomeIcon icon={faSuperscript} />,
    method: "inline",
  },
  {
    label: "Subscript",
    style: "SUBSCRIPT",
    icon: <FontAwesomeIcon icon={faSubscript} />,
    method: "inline",
  },
  {
    label: "Monospace",
    style: "CODE",
    icon: <FontAwesomeIcon icon={faTextWidth} transform="grow-3" />,
    method: "inline",
  },
  {
    label: "Code Block",
    style: "CODEBLOCK",
    icon: <FontAwesomeIcon icon={faCode} transform="grow-3" />,
    method: "inline",
  },
  {
    label: "Uppercase",
    style: "UPPERCASE",
    icon: <FontAwesomeIcon icon={faChevronUp} transform="grow-3" />,
    method: "inline",
  },
  {
    label: "lowercase",
    style: "LOWERCASE",
    icon: <FontAwesomeIcon icon={faChevronDown} transform="grow-3" />,
    method: "inline",
  },
  {
    label: "Unordered-List",
    style: "unordered-list-item",
    method: "block",
    icon: <FontAwesomeIcon icon={faListUl} transform="grow-6" />,
  },
  {
    label: "Ordered-List",
    style: "ordered-list-item",
    method: "block",
    icon: <FontAwesomeIcon icon={faListOl} transform="grow-6" />,
  },
];

const FloatingToolbar = (props) => {
  const applyStyle = (e, style, method) => {
    e.preventDefault();
    method === "block"
      ? props.setEditorState(
          RichUtils.toggleBlockType(props.editorState, style)
        )
      : props.setEditorState(
          RichUtils.toggleInlineStyle(props.editorState, style)
        );
  };

  const isActive = (style, method) => {
    if (method === "block") {
      const selection = props.editorState.getSelection();
      const blockType = props.editorState
        .getCurrentContent()
        .getBlockForKey(selection.getStartKey())
        .getType();
      return blockType === style;
    } else {
      const currentStyle = props.editorState.getCurrentInlineStyle();
      return currentStyle.has(style);
    }
  };

  return (
    props.show && (
      <div
        className={styles.container}
        style={{
          top: props.data?.top - 45,
          left: props.data?.left,
        }}
      >
        {tools.map((item, idx) => (
          <button
            className="toolbar-item"
            key={`${item.label}-${idx}`}
            title={item.label}
            onClick={(e) => applyStyle(e, item.style, item.method)}
            onMouseDown={(e) => e.preventDefault()}
            style={{
              border: "none",
              width: 24,
              height: 24,
              color: isActive(item.style, item.method)
                ? "rgba(0, 0, 0, 1)"
                : "rgba(0, 0, 0, 0.3)",
            }}
          >
            {item.icon || item.label}
          </button>
        ))}
      </div>
    )
  );
};

export default FloatingToolbar;
