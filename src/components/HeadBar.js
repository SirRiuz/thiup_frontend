
const HeadBar = props => {
  return (
    <div
      style={{
        display: 'flex',
        position: 'sticky',
        zIndex: 999,
        minHeight: 65,
        width: '100%',
        top: 0,
        left: 0,
        alignContent: 'center',
        alignItems: 'center',
        background: 'white',
        ...props.styles
      }}>
        {props.children}
    </div>
  )
}

export default HeadBar
