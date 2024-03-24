import { queryClient } from "../context/AplicationContext"
import { useQuery } from "react-query";
import { threadService } from "../services/thread";
import { useEffect, useState } from "react"
import { paginationService } from "../services/pagination";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import ThreadCard from "../components/ThreadCard";
import Flag from "react-world-flags";
import ThreadSkeleton from "../components/ThreadSkeleton";
import CommentBox from "../components/Comment"
import styles from "../styles/screens/home.module.css"
import SearchBar from "../components/SearchBar";
import EndFeed from "../components/EndFeed";


var scrollTimer = -1;


const Home = () => {
  const [threads, setThreads] = useState([])
  const [scrollIndex, setScrollIndex] = useState(0)
  const [next, setNext] = useState(null)
  const [isLoadPag, setIsPagLoad] = useState(false)
  const { isLoading, data, isError } = useQuery(["threads"],
    () => threadService({}).then((res) => res.data))

  useEffect(() => {
    if (data?.scrollIndex)
      setScrollIndex(() => data?.scrollIndex)

    if (data?.results) {
      setNext(() => data.next)
      setThreads(() => data.results)
    }
  }, [data])

  const feed = threads.map((x, k) => (
    <Link
      key={k}
      className={styles.thread}
      to={`/t/${x.short_id}/`}
    >
      <ThreadCard
        iconSize={40}
        textFontSize={14}
        response={x}
        showNewThread={true}
        repliesCount={x.responses_count}
        flag={(<Flag
          code="MX"
          height="11"
          frameBorder={9}
          style={{ borderRadius: 3}}
        />)}
        style={{
          borderRadius: 10,
          padding: "20px 20px 20px 20px",
          color: "#2e2f33",
          border: "solid 1px rgba(235, 235, 235, 1.00)",
          marginBottom: !(k === threads.length - 1) ? 18 : 0,
          cursor: "pointer",
          background: "#FFFFFF"
        }}
      />
    </Link>
  ))

  return (
    <Layout
      content={{
        scrollY: scrollIndex,
        onScroll: (e) => {
          if (scrollTimer != -1) { clearTimeout(scrollTimer) }
          scrollTimer = window.setTimeout(() => {
            const { data } = queryClient.getQueryState("threads")
            data["scrollIndex"] = e.target.scrollTop
            queryClient.setQueriesData("threads", data)
          }, 500);
        }
      }}
      onPaginate={() => {
        try {
          const { data } = queryClient.getQueryState(["threads"])
          if (next && !isLoadPag) {
            setIsPagLoad(() => true)
            paginationService({ next: next })
              .then((res) => res.data)
              .then(res => {
                setNext(() => res.next)
                setThreads(() => [...threads, ...res.results])
                data.next = res.next
                data.results = [...threads, ...res.results]
                queryClient.setQueriesData("threads", data)
              })
              .finally(() => setIsPagLoad(() => false))
          }
        } catch (e) { window.location = "/" }
      }}
    >
      <SearchBar />
      {!isLoading && feed && !isError && feed && (
        <div
          style={{
            borderRadius: 10,
            color: "#2e2f33",
            border: "solid 1px rgb(229, 229, 229)",
            marginBottom: 35,
          }}
        >
          <CommentBox
            iconSize={43}
            btnPlaceholder={"Post"}
            placeholder={"Start a thread"}
          />
        </div>
      )}
      {(isLoading || isError) && <ThreadSkeleton />}
      {!isLoading && feed}
      {isLoadPag && (<ThreadSkeleton style={{ marginTop: 18 }} size={1} />)}
      {next === null && !isLoading && threads.length >= 1 && (
        <div style={{ height: 260 }}>
          <EndFeed />
        </div>
      )}
    </Layout>
  );
}

export default Home
