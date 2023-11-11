import React, { useEffect, useRef, useState } from "react"
import {
  Editor,
  EditorState,
  convertToRaw,
} from "draft-js"
import FloatingToolbar from "./FloatingToolbar"
import "draft-js/dist/Draft.css"
import '../styles/draftEditor.css'

const DraftEditor = props => {
  const editor = useRef(null)
  const [editorLocation, setLocation] = useState(null)
  const [editorState, setEditorState] = useState(EditorState.createEmpty())
  const styleMap = {
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
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, Liberation, Mono, monospace',
      fontSize: "12px",
      color: "rgb(53, 55, 59)",
      padding: "2px 4px",
      borderRadius: " 4px",
      background: "rgb(242, 242, 243)",
      boxShadow: "rgba(0, 0, 0, 0.08) 0px 0px 0px 1px inset"
    },
    SUPERSCRIPT: {
      verticalAlign: "super",
      fontSize: "80%",
    },
    SUBSCRIPT: {
      verticalAlign: "sub",
      fontSize: "80%",
    },
  }

  const onSelectedText = () => {
    const selection = window.getSelection()
    const selectedText = selection.toString()
    if (selectedText) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setLocation(() => ({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }))
    } else {
      setLocation(() => null)
    }
  }

  const getText = e => {
    var text = e.blocks.map((x, k) => x.text)
    return text.join('')
  }

  const resetEditor = () => {
    if (props.reset) {
      setEditorState(() => EditorState.createEmpty())
      props.onReset()
      props.onBlur()
      props.onChange('')
    }
  }

  const onFocus = _ => {
    if (props.focus)
      editor.current.focus()
  }

  useEffect(() => {
    resetEditor()
    onFocus()
  })

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
          placeholder={props.placeholder !== undefined ?
            props.placeholder : "Leave a comment"}
          editorState={editorState}
          customStyleMap={styleMap}
          onBlur={() => {
            props.onBlur()
            setLocation(() => null)
          }}
          onFocus={() => props.onFocus()}
          onChange={(editorState) => {
            const contentState = editorState.getCurrentContent()
            const text = getText(convertToRaw(contentState))
            props.onChange(text)
            setEditorState(editorState)
          }}
        />
      </div>
    </div>
  )
}

export default DraftEditor
