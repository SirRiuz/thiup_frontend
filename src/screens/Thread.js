import { useLoaderData } from "react-router-dom"
import { useState } from "react"
import InfiniteScroll from 'react-infinite-scroll-component'
import Grid from "@mui/material/Grid"
import CommentBox from "../components/Comment"
import usePagination from "../hooks/usePagination"
import TimeLine from "../components/TimeLine"
import ThreadCard from "../components/ThreadCard"
import Flag from 'react-world-flags'
import "../styles/screens/thread.css"


const Thread = _ => {
  const data = useLoaderData().data
  const [res, setRes] = useState(data.results)
  const [focusBox, setFocusBox] = useState(false)
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
        marginBottom: 450,
        marginTop: 50
      }}
    >
      <Grid item xs={0} md={0} />
      <Grid item xs={12} md={10} lg={4}>
        <ThreadCard
          isHead={true}
          iconSize={44}
          textFontSize={16}
          response={data.head}
          onComment={() => setFocusBox(() => true)}
          style={{
            padding: '24px 24px 24px',
            borderRadius: 10,
            backgroundColor: 'rgb(252, 252, 253)',
            color: '#2e2f33'
          }}
          flag={(<Flag
            code={"col"}
            height="11.5"
            frameBorder={10}
            style={{ borderRadius: 3.1192 }}
          />)}
        />

        <div style={{ marginBottom: 25, marginTop: 40 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              lineHeight: "20px"
            }}
          >
            {data.count > 0 ? data.count + (res.length - data.count) :
              res.length > 0 ? res.length : ""} Comments
          </span>
        </div>

        <div className="threads-root">
          <InfiniteScroll
            dataLength={res.length}
            hasMore={true}
            next={onPaginate}
          >
            <TimeLine
              parent={data}
              responses={res}
            />
          </InfiniteScroll>
          <div
            style={{ padding: 15, backgroundColor: 'rgb(252, 252, 253)', borderRadius: 11, }}
          >
            <div
              style={{
                background: 'rgb(255, 255, 255)',
                borderRadius: 6.4,
                paddingTop: 5,
                paddingBottom: 5,
                boxShadow: `rgba(0, 0, 0, 0.05) 0px 2px 8px,
                    rgba(0, 0, 0, 0.08) 0px 0px 0px 1px,
                    rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset`
              }}
            >
              <CommentBox
                focus={focusBox}
                placeholder={"Post your reply"}
                iconSize={30}
                onComplete={onRefreshThread}
                id={data.head.id}
                onBlur={() => setFocusBox(() => false)}
              />
            </div>
          </div>
        </div>

      </Grid>
      <Grid item xs={0} md={0} />
    </Grid>
  )
}

export default Thread
