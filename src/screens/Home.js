import ThreadHead from "../components/ThreadHead"
import { useLoaderData, useNavigation } from "react-router-dom"
import { useEffect } from "react"
import { Grid } from "@mui/material"
import CommentBox from "../components/Comment"
import TurboBar from "../components/TurboBar"


const Home = _ => {
  const data = useLoaderData()
  const { state } = useNavigation()
  useEffect(() => {
    if(data.location !== undefined) {
      window.scroll(0, data.location)
    }
  }, [])
  
  return (
    <div>
      {state === "loading" ? <TurboBar/>:null}
      <Grid
        container
        justifyContent={"center"}
        alignContent={"center"}
        alignItems={"center"}
        spacing={3}
        style={{
          marginBottom:20,
          marginTop:20}}
      >
        <Grid item xs={0} md={3}/>
        <Grid item xs={10} md={5}>
          <CommentBox></CommentBox>
          <ThreadHead
            isLoading={(state === "loading")}
            responses={data.data.results}
          />
        </Grid>
        <Grid item xs={0} md={3}/>
      </Grid>
    </div>
  )
}

export default Home
