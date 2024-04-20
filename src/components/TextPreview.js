import React from "react";
import { Link } from "react-router-dom";
import {
  Editor,
  EditorState,
  CompositeDecorator,
  convertFromRaw,
} from "draft-js";

const TextPreview = (props) => {
  const findHashtags = (contentBlock, callback) => {
    const text = contentBlock.getText();
    const hashtagRegex = /#([\w\u00C0-\u017F]+)/g;
    let match;
    while ((match = hashtagRegex.exec(text)) !== null) {
      callback(match.index, match.index + match[0].length);
    }
  };

  const findUrls = (contentBlock, callback) => {
    const text = contentBlock.getText();
    const urlRegex = /(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*$/gi;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      callback(match.index, match.index + match[0].length, match);
    }
  };

  const searchQuery = (contentBlock, callback) => {
    let match;
    const text = contentBlock.getText();
    const dynamicTextRegex = new RegExp(`${props.search}`, "gi");
    while ((match = dynamicTextRegex.exec(text)) !== null) {
      callback(match.index, match.index + match[0].length);
    }
  };

  const contentState = convertFromRaw(props.data);
  const decorator = new CompositeDecorator([
    {
      strategy: findUrls,
      component: (props) => (
        <a
          target="_blank"
          href={props.decoratedText}
          onClick={(e) => {
            e.stopPropagation();
          }}
          style={{
            color: "rgb(107, 74, 252)",
            textDecoration: "none",
          }}
        >
          {new URL(props.decoratedText).host + "/..."}
        </a>
      ),
    },
    {
      strategy: findHashtags,
      component: (props) => (
        <Link
          to={`/explore/tags/${props.decoratedText
            .substring(1)
            .toLocaleLowerCase()}/`}
          style={{
            textDecoration: "none",
            color: "rgb(107, 74, 252)",
            cursor: "pointer",
            fontSize: props.fontSize,
            fontStyle: "normal",
            fontWeight: 500,
          }}
        >
          {props.children}
        </Link>
      ),
    },
    {
      strategy: searchQuery,
      component: (props) => (
        <span
          style={{
            color: "#0f1419",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {props.children}
        </span>
      ),
    },
  ]);

  const state = EditorState.createWithContent(contentState, decorator);

  return <Editor editorState={state} readOnly={true} />;
};

export default TextPreview;
