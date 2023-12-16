import "draft-js/dist/Draft.css";
import "../styles/draftEditor.css";
import React, { useEffect, useRef, useState } from "react";
import FloatingToolbar from "./FloatingToolbar";
import { Editor, EditorState, convertToRaw } from "draft-js";

const STYLE_MAP = {
  CODE: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2,
  },
  HIGHLIGHT: {
    backgroundColor: "#F7A5F7",
  },
  UPPERCASE: {
    textTransform: "uppercase",
  },
  LOWERCASE: {
    textTransform: "lowercase",
  },
  CODEBLOCK: {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, Liberation, Mono, monospace',
    fontSize: "12px",
    color: "rgb(53, 55, 59)",
    padding: "2px 4px",
    borderRadius: " 4px",
    background: "rgb(242, 242, 243)",
    boxShadow: "rgba(0, 0, 0, 0.08) 0px 0px 0px 1px inset",
  },
  SUPERSCRIPT: {
    verticalAlign: "super",
    fontSize: "80%",
  },
  SUBSCRIPT: {
    verticalAlign: "sub",
    fontSize: "80%",
  },
};

const DraftEditor = (props) => {
  const editor = useRef(null);
  const [editorLocation, setLocation] = useState(null);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());

  const onSelectedText = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    if (selectedText) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setLocation(() => ({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }));
    } else {
      setLocation(() => null);
    }
  };

  useEffect(() => {
    (() => {
      if (props.reset) {
        setEditorState(() => EditorState.createEmpty());
        props.onReset();
        props.onBlur();
        props.onChange("");
      }
    })();

    (() => {
      if (props.focus) editor.current.focus();
    })();
  });

  return (
    <div
      onMouseUpCapture={onSelectedText}
      onKeyUp={() => setLocation(() => null)}
    >
      <div>
        <FloatingToolbar
          editorState={editorState}
          setEditorState={setEditorState}
          data={editorLocation}
          show={Boolean(editorLocation)}
        />
        <Editor
          ref={editor}
          placeholder={
            props.placeholder !== undefined
              ? props.placeholder
              : "Leave a comment"
          }
          editorState={editorState}
          customStyleMap={STYLE_MAP}
          onBlur={() => {
            props.onBlur();
            setLocation(() => null);
          }}
          onFocus={(_) => props.onFocus()}
          onChange={(e) => {
            const contentState = e.getCurrentContent();
            props.onChange({
              data: convertToRaw(contentState),
              text: contentState.getPlainText(),
            });
            setEditorState(e);
          }}
        />
      </div>
    </div>
  );
};

export default DraftEditor;
