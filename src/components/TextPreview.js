import React from 'react'
import { Editor, EditorState, CompositeDecorator, convertFromRaw } from 'draft-js'


const TextPreview = (props) => {
  const findHashtags = (contentBlock, callback) => {
    const text = contentBlock.getText()
    const hashtagRegex = /#(\w+)/g
    let match
    while ((match = hashtagRegex.exec(text)) !== null) {
      callback(match.index, match.index + match[0].length)
    }
  }

  const handleKeyCommand = (command) => {
    if (command === 'enter') {
      const selection = state.getSelection()
      const content = state.getCurrentContent()
      const currentBlock = content.getBlockForKey(selection.getStartKey())
      const hashtagText = currentBlock.getText().slice(
        selection.getStartOffset(),
        selection.getEndOffset()
      )

      if (hashtagText.startsWith('#')) {
        window.location.href = `/search/tag/${hashtagText.substring(1)}/`
        return 'handled'
      }
    }

    return 'not-handled'
  }

  const handleHashtagClick = (props) => {
    const hashtagText = props.decoratedText.substring(1)
    window.location.href = `/search/tag/${hashtagText}/`
  }
  const contentState = convertFromRaw(JSON.parse(props.data))
  const decorator = new CompositeDecorator([
    {
      strategy: findHashtags,
      component: (props) => (
        <span
          style={{
            color: 'rgb(107, 74, 252)',
            cursor: 'pointer',
            fontWeight: 550
          }}
          onClick={() => handleHashtagClick(props)}
        >
          {props.children}
        </span>
      ),
    },
  ])
  const state = EditorState.createWithContent(contentState, decorator)
  return (
    <Editor
      editorState={state}
      readOnly={true}
      handleKeyCommand={handleKeyCommand}
    />
  )
}

export default TextPreview
