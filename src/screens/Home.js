import { useLoaderData } from "react-router-dom"
import { Link } from "react-router-dom";
import { Grid } from "@mui/material"
import CommentBox from "../components/Comment"
import TurboBar from "../components/TurboBar"
import ThreadCard from '../components/ThreadCard'
import Flag from "react-world-flags";

const Home = _ => {
  const data = useLoaderData()
  return (
    <Grid
      container
      justifyContent={"center"}
      alignContent={"center"}
      alignItems={"center"}
      spacing={3}
      style={{
        marginBottom: 350,
        marginTop: 45
      }}
    >
      <Grid item xs={0} md={0} />
      <Grid item xs={12} md={10} lg={4}>
        {/* <CommentBox /> */}
        {data.data.results.map((x, k) => (
          <Link to={`/t/${x.short_id}/`} style={{ textDecoration: 'none' }}>
            <ThreadCard
              key={k}
              iconSize={44}
              textFontSize={16}
              response={x}
              useFloatingMenu={false}
              flag={(<Flag
                code={"col"}
                height="11.5"
                frameBorder={10}
                style={{ borderRadius: 3.1192 }}
              />)}
              style={{
                padding: '24px 24px 24px',
                borderRadius: 10,
                backgroundColor: 'rgb(252, 252, 253)',
                marginBottom: 20,
                color:'#2e2f33'
              }}
            />
          </Link>
        ))}
      </Grid>
      <Grid item xs={0} md={0} />
    </Grid>
  )
}

export default Home
