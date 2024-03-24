import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { threadService } from "../services/thread"
import { useQuery } from "react-query"
import { Skeleton } from "@mui/material"
import { paginationService } from "../services/pagination"
import CommentBox from "../components/Comment"
import TimeLine from "../components/TimeLine"
import ThreadCard from "../components/ThreadCard"
import Flag from "react-world-flags"
import Layout from "../components/Layout"
import ThreadSkeleton from "../components/ThreadSkeleton"
import HeadBar from "../components/HeadBar"
import GoBack from "../components/GoBack"
import styles from "../styles/screens/thread.module.css"
import ErrorMessage from "../components/ErrorMessage"
import EndFeed from "../components/EndFeed"
import Separator from "../components/Separator"


const ThreadLoader = _ => (
  <div>
    <ThreadSkeleton style={{ marginBottom: 50 }} size={1} />
    <ThreadSkeleton size={1} style={{ marginBottom: 0, borderRadius: '10px 10px 0px 0px' }} />
    <ThreadSkeleton size={1} style={{ marginBottom: 0, borderRadius: '0px 0px 0px 0px', borderBottom: 'solid 0px white', borderTop: 'solid 0px white' }} />
    <ThreadSkeleton size={1} style={{ marginBottom: 0, borderRadius: '0px 0px 10px 10px' }} />
  </div>
)


const ThreadHead = props => (
  <HeadBar
    styles={{
      display: "flex",
      alignContent: "center",
      alignItems: "center",
      flex: 1,
      gap: 10
    }}
  >
    <GoBack />
    {!props.isError && (props.isLoad ? (
      <Skeleton
        width={"60px"}
        style={{ background: "#EAEAEA" }}
      />
    ) : (
      <div>
        <strong className={styles.title}>
          Thread
        </strong>
      </div>
    ))}
  </HeadBar>
)


export default function Thread() {
  const { thread } = useParams()
  const [threads, setThreads] = useState([])
  const [head, setHead] = useState(null)
  const [count, setCount] = useState(0)
  const [isLoadPag, setIsPagLoad] = useState(false)
  const [focusBox, setFocusBox] = useState(false)
  const [next, setNext] = useState(null)
  const { data, isLoading, isError } = useQuery(thread,
    () => threadService({ id: thread }).then((res) => res.data))

  const onRefreshThread = (thread) => {
    setThreads(() => [...threads, thread])
    setCount((e) => threads.length + 1)
  }

  useEffect(() => {
    if (data?.results && data?.head) {
      setThreads(() => data.results)
      setHead(() => data.head)
      setNext(() => data.next)
      setCount(() => data.count)
      document.title = `${data.head.text} | Thiup`
      window.scrollTo(0, 0)
    }
  }, [data])

  return (
    <Layout
      onPaginate={() => {
        if (next && !isLoadPag) {
          setIsPagLoad(() => true)
          paginationService({ next: next })
            .then((res) => res.data)
            .then(res => {
              setNext(() => res.next)
              setThreads(() => [...threads, ...res.results])
            })
            .finally(() => setIsPagLoad(() => false))
        }
      }}
    >
      {<ThreadHead isLoad={isLoading} isError={isError} />}
      {(isLoading) && (<ThreadLoader />)}
      {head && !isLoading && !isError && (
        <div className={styles.container}>
          <ThreadCard
            reactionable={true}
            isHead={true}
            iconSize={43}
            textFontSize={17}
            useFloatingMenu={true}
            response={head}
            showNewThread={true}
            onComment={() => setFocusBox(() => true)}
            style={{
              borderRadius: 10,
              padding: "20px 20px 20px 20px",
              color: "#2e2f33",
              border: "solid 1px rgba(235, 235, 235, 1.00)",
              marginBottom: 18
            }}
            flag={
              <Flag
                code={"mx"}
                height="10.5"
                frameBorder={10}
                style={{ borderRadius: 3.1192 }}
              />
            }
          />
          <p className={styles.responsesCount}>
            {count > 0 ? count : ""} Comments
          </p>
          <div className={styles.threadContainer}>
            <TimeLine parent={head} responses={threads} />
            {isLoadPag && (
              <>
                <ThreadSkeleton
                  size={1}
                  style={{
                    marginBottom: 0,
                    border: 'solid 1px white',
                  }}
                />
                <Separator />
              </>
            )}
            <div className={styles.commentBoxContainer}>
              <CommentBox
                focus={focusBox}
                placeholder={"Post your reply"}
                iconSize={30}
                onComplete={onRefreshThread}
                id={head.id}
                onBlur={() => setFocusBox(() => false)}
                style={{ borderRadius: 6.5 }}
              />
            </div>
          </div>
          {next === null && !isLoading && (
            <div style={{ height: 250 }}>
              {threads.length >= 1 && (<EndFeed />)}
            </div>
          )}
        </div>
      )}
      {isError && (
        <ErrorMessage
          title={(<span>🔍 Post not available.</span>)}
          description={(
            <span style={{ fontSize: 15 }}>
              We could not find a post associated with the
              provided ID.
            </span>
          )}
        />
      )}
    </Layout>
  )
}
