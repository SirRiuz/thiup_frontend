import ReactionPreview from './ReactionBox'
import ProfileIcon from './ProfileIcon'
import TextPreview from './TextPreview'
import SvgPublic from '../assets/svg/SvgPublic'
import SvgReply from '../assets/svg/SvgReply'
import SvgReact from '../assets/svg/SvgReact'
import { useState } from 'react'
import ReactionModal from './ReactionModal'
import '../styles/threads.css'


const ThreadFloatingMenu = props => {
  const [focus, setFocus] = useState(null)
  const MENU_ACTIONS = [
    {
      icon: <SvgReply />,
      description: '',
      method: props.onComment
    }, {
      icon: <SvgReact />,
      description: '',
      method: props.onReact
    }
  ]

  return props.show && (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        background: 'rgb(255, 255, 255)',
        zIndex: 10,
        right: 0,
        gap: 5,
        marginRight: 10,
        marginTop: 10,
        borderRadius: 8,
        padding: 4,
        boxShadow: `rgba(0, 0, 0, 0.06) 0px 4px 12px,
          rgba(0, 0, 0, 0.24) 0px 0px 2px, rgba(255, 255, 255, 0.08)
          0px 0px 0px 1px inset
        `
      }}
    >
      {MENU_ACTIONS.map((x, k) => (
        <div
          key={k}
          onClick={x.method}
          onMouseEnter={() => setFocus(() => k)}
          onMouseLeave={() => setFocus(() => null)}
          style={{
            position: 'relative',
            display: 'flex',
            boxShadow: focus === k ? 'rgb(228, 229, 231) 0px 0px 0px 1px' : '',
            background: focus === k ? 'rgb(242, 242, 243)' : '',
            width: 24,
            height: 24,
            borderRadius: 6,
            cursor: 'pointer',

            justifyContent: 'center',
            alignContent: 'center',
            justifyItems: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {x.icon}
        </div>
      ))}
    </div>
  )
}

const ThreadCard = props => {
  const [show, setShow] = useState(false)
  const [showReactModal, setShowReactModal] = useState(false)
  const [selectReaction, setSelectReaction] = useState(null)
  return (
    <div
      onMouseLeave={() => setShow(() => false)}
      onMouseEnter={() => setShow(() => true)}
      style={{
        background: show ? 'rgb(243, 243, 247)' : 'rgb(252, 252, 253)',
        position: 'relative',
        boxShadow: `rgba(0, 0, 0, 0.06) 0px 0px 0px 1px, rgba(0, 0, 0, 0.08)
                    0px 2px 8px, rgba(255, 255, 255, 0.08)
                    0px 0px 0px 1px inset`,
        ...props.style
      }}
      onClick={() => {
        if (props.onClick !== undefined) {
          props.onClick()
        }
      }}
    >
      {!(props.useFloatingMenu === false) && (
        <ThreadFloatingMenu
          show={show}
          onComment={props.onComment}
          onReact={() => setShowReactModal((state) => !state)}
        />
      )}
      <div className='response-content'>
        <div className='meta-thread'>
          <ProfileIcon
            flag={props.flag}
            iconSize={props.iconSize !== undefined ?
              props.iconSize : 30}
          />
          <div
            style={{
              display: 'flex',
              gap: 4,
              alignItems: 'center',
              alignContent: 'center',
              textAlign: 'center',
              justifyContent: 'center'
            }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: '#2a251d',
                fontStyle: 'normal',
                fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI',
                              Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
                              'Helvetica Neue', sans-serif`,
                ...props.titleHashStyles
              }}
            >
              @18ac3e73
            </span>
            <span className='thread-date'>16h</span>
            {props.isHead && (<span className='thread-date'> · <SvgPublic /></span>)}
          </div>
        </div>
        <div
          style={{
            fontSize: props.textFontSize !== undefined ?
              props.textFontSize : 15
          }}
        >
          <TextPreview data={props.response.text} />
        </div>
        <div
          style={{
            display: 'flex',
            color: 'rgba(0, 0, 0, .8)',
            gap: 10
          }}
        >
          <ReactionPreview
            selectReaction={selectReaction}
            last={props.response.last_reaction}
            thread={props.response.id}
            data={props.response.reactions}
            onCompleteReaction={() => setShowReactModal(() => false)}
          />
          <ReactionModal
            show={showReactModal}
            onClose={() => setShowReactModal(() => false)}
            onSelect={(reaction) => setSelectReaction(() => reaction)}
          />
        </div>
      </div>
    </div>
  )
}


export default ThreadCard
