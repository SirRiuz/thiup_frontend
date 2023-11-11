import { useLoaderData } from "react-router-dom"
import { useState } from "react"
import InfiniteScroll from 'react-infinite-scroll-component'
import Grid from "@mui/material/Grid"
import CommentBox from "../components/Comment"
import usePagination from "../hooks/usePagination"
import TimeLine from "../components/Threads"
import "../styles/screens/thread.css"


const Thread = _ => {
  const data = useLoaderData().data
  const [res, setRes] = useState(data.results)
  const [next, setNext] = useState(data.next)
  const [isLoadPagination, setLoadPagination] = useState(false)
  const { paginate } = usePagination()
  const onRefreshThread = e => setRes(
    () => [...res, e.data])

  const onPaginate = e => {
    setLoadPagination(() => true)
    if (next !== null && !isLoadPagination) {
      paginate(next, (res) => {
        setNext(() => res.next)
        setRes((x) => x.concat(res.results))
        setLoadPagination(() => false)
      })
    }
  }

  return (
    <Grid
      container
      justifyContent={"center"}
      alignContent={"center"}
      alignItems={"center"}
      spacing={3}
      style={{
        marginBottom: 150,
        marginTop: 50
      }}
    >
      <Grid item xs={0} md={0} />
      <Grid item xs={12} md={3}>
        <div id="threads-root">
          <InfiniteScroll
            dataLength={res.length}
            hasMore={true}
            next={onPaginate}
          >
            <TimeLine
              parent={data}
              responses={res}
            />
            <div style={{ padding: 12 }}>
              <div
                style={{
                  backgroundColor: 'rgb(255, 255, 255)',
                  borderRadius: 6.4,
                  paddingTop:5,
                  paddingBottom:5,
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 2px 8px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px, rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset'
                }}
              >
                <CommentBox
                  placeholder={"Post your reply"}
                  iconSize={30}
                  onComplete={onRefreshThread}
                  id={data.head.id}
                />
              </div>
            </div>
          </InfiniteScroll>
        </div>
      </Grid>
      <Grid item xs={0} md={0} />
    </Grid>
  )
}

export default Thread
