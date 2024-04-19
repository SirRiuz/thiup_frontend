import { useBottomScrollListener } from "react-bottom-scroll-listener";
import { Container, Grid } from "@mui/material";
import { useEffect } from "react";

export default function Layout(props) {
  const scrollRef = useBottomScrollListener(() => {
    if (props.onPaginate) {
      props.onPaginate();
    }
  });

  useEffect(() => {
    if (props.content?.scrollY) {
      scrollRef.current.scrollTo(0, props.content.scrollY);
    }
  }, [props.content?.scrollY]);

  return (
    <Grid
      container
      ref={scrollRef}
      onScroll={(e) => {
        if (props.content?.onScroll !== undefined) {
          props.content.onScroll(e);
        }
      }}
      justifyContent={"space-evenly"}
      style={{
        overflowX: "hidden",
        overflowY: "scroll",
      }}
    >
      <Grid item lg={8} md={10} sm={10} xs={11} style={{ height: "100vh" }}>
        <Container
          maxWidth={"sm"}
          children={props.children}
          style={{ padding: 0 }}
        />
      </Grid>
    </Grid>
  );
}
