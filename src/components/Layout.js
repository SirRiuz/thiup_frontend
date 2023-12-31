import { useBottomScrollListener } from 'react-bottom-scroll-listener'
import { Container, Grid } from "@mui/material"
import { useEffect } from "react"


const Layout = props => {
  const scrollRef = useBottomScrollListener(() => {
    if (props.onPaginate !== undefined) {
      props.onPaginate()
    }
  })

  useEffect(() => {
    if (props.content?.scrollY) {
      scrollRef.current.scrollTo(0, props.content.scrollY)
    }
  }, [props.content?.scrollY])

  return (
    <Grid
      container
      justifyContent={'space-evenly'}
    >
      <Grid
        item
        lg={2}
        md={1}
        sm={1}
        children={props.left}
        //style={{ borderRight: 'solid 1px rgba(0, 0, 0, 0.1)' }}
        display={{
          lg: 'block',
          md: 'block',
          sm: 'block',
          xs: 'none'
        }}
      />
      <Grid
        ref={scrollRef}
        onScroll={(e) => {
          if (props.content?.onScroll !== undefined) {
            props.content.onScroll(e)
          }
        }}
        item
        lg={8}
        md={10}
        sm={10}
        style={{
          overflowX: 'hidden',
          overflowY: 'scroll',
          height: '100vh',
        }}
      >
        {/* <CommentBox></CommentBox> */}
        <div
          style={{
            display: 'flex',
            //borderBottom: 'solid 1px rgba(0, 0, 0, 0.1)',
            position: 'sticky',
            backgroundColor: 'rgba(244, 245, 245,0.5)',
            zIndex: 999,
            minHeight: 56,
            width: '100%',
            top: 0,
            left: 0
          }}>
          <div style={{ flex: 1, backdropFilter: 'blur(7px)' }}>
            {props.head}
          </div>
        </div>

        <Container
          maxWidth={'sm'}
          children={props.children}
          style={{
            marginTop: 35,
            marginBottom: 120
          }}
        />
      </Grid>

      <Grid
        item
        lg={2}
        md={1}
        sm={1}
        style={{
          //borderLeft: 'solid 1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
        children={props.rigth}
        display={{
          lg: 'block',
          md: 'block',
          sm: 'block',
          xs: 'none'
        }}
      >
      </Grid>
    </Grid>
  )
}


export default Layout
