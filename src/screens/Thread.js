import { paginationService } from "../services/pagination"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { threadService } from "../services/thread"
import { useQuery } from "react-query"
import CommentBox from "../components/Comment"
import TimeLine from "../components/TimeLine"
import ThreadCard from "../components/ThreadCard"
import Flag from "react-world-flags"
import Layout from "../components/Layout"
import ThreadSkeleton from "../components/ThreadSkeleton"


const Thread = () => {
  const { thread } = useParams()
  const [threads, setThreads] = useState([])
  const [head, setHead] = useState(null)
  const [count, setCount] = useState(0)
  const [isLoadPag, setIsPagLoad] = useState(false)
  const [focusBox, setFocusBox] = useState(false)
  const [next, setNext] = useState(null)
  const { data, isLoading, isError } = useQuery(thread,
    () => threadService({ id: thread }).then((res) => res.data))

  const onRefreshThread = (e) => {
    setThreads(() => [...threads, e.data])
    setCount((e) => e + 1)
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
      {(isLoading || isError) && (
        <div>
          <ThreadSkeleton style={{ marginBottom: 60 }} size={1} />
          <ThreadSkeleton size={3} />
        </div>
      )}
      {head && !isLoading && !isError && (
        <div>
          <ThreadCard
            isHead={true}
            iconSize={43}
            textFontSize={15}
            response={head}
            showNewThread={true}
            onComment={() => setFocusBox(() => true)}
            style={{
              borderRadius: 10,
              padding: "24px 24px 24px",
              backgroundColor: "rgb(252, 252, 253)",
              color: "#2e2f33",
              boxShadow: `rgba(0, 0, 0, 0.06) 0px 0px 0px 1px, rgba(0, 0, 0, 0.08)
                0px 2px 8px, rgba(255, 255, 255, 0.08)
                0px 0px 0px 1px inset`,
            }}
            flag={
              <Flag
                code={head.mask.country_code}
                height="10.5"
                frameBorder={10}
                style={{ borderRadius: 3.1192 }}
              />
            }
          />
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              lineHeight: "20px",
              marginTop: 35,
              marginBottom: 35
            }}
          >
            {count > 0 ? count : ""} Comments
          </p>

          <div
            style={{
              background: 'white',
              borderRadius: 11,
              boxShadow: `rgba(0, 0, 0, 0.06) 0px 0px 0px 1px, rgba(0, 0, 0, 0.08)
              0px 2px 8px, rgba(255, 255, 255, 0.08)
              0px 0px 0px 1px inset`
            }}
          >
            <TimeLine parent={head} responses={threads} />
            {isLoadPag && (<h1>LOAD SPINNER</h1>)}
            <div
              style={{
                background: "rgb(252, 252, 253)",
                padding: 13,
                marginBottom: 150,
                borderRadius: 11,
              }}
            >
              <CommentBox
                focus={focusBox}
                placeholder={"Post your reply"}
                iconSize={30}
                onComplete={onRefreshThread}
                id={head.id}
                onBlur={() => setFocusBox(() => false)}
                style={{
                  borderRadius: 6.5,
                  background: "rgb(255, 255, 255)",
                  boxShadow: `rgba(0, 0, 0, 0.05) 0px 2px 8px,
                  rgba(0, 0, 0, 0.08) 0px 0px 0px 1px,
                  rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset`
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Thread
