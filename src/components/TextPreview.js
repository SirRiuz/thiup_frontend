import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Editor, 
  EditorState, 
  CompositeDecorator, 
  convertFromRaw } from 'draft-js'


const TextPreview = (props) => {
  const findHashtags = (contentBlock, callback) => {
    const text = contentBlock.getText()
    const hashtagRegex = /#([\w\u00C0-\u017F]+)/g;
    let match
    while ((match = hashtagRegex.exec(text)) !== null) {
      callback(match.index, match.index + match[0].length)
    }
  }

  const findHello = (contentBlock, callback) => {
    const text = contentBlock.getText();
    const dynamicTextRegex = new RegExp(`${props.search}`, 'gi');
    let match;
    while ((match = dynamicTextRegex.exec(text)) !== null) {
      callback(match.index, match.index + match[0].length);
    }
  }

  const contentState = convertFromRaw(props.data)
  const decorator = new CompositeDecorator([
    {
      strategy: findHashtags,
      component: (props) => (
        <Link
          to={`/explore/tags/${props.decoratedText.substring(1)}/`}
          style={{
            textDecoration: 'none',
            color: 'rgb(107, 74, 252)',
            cursor: 'pointer',
            fontWeight: 550
          }}
        >
          {props.children}
        </Link>
      ),
    },
    {
      strategy: findHello,
      component: (props) => (
        <span
          style={{
            color: '#0f1419',
            fontWeight: 650
          }}
        >{props.children}
        </span>
      ),
    },
  ])
  const state = EditorState.createWithContent(contentState, decorator)

  return (
    <Editor
      editorState={state}
      readOnly={true}
    />
  )
}

export default TextPreview

