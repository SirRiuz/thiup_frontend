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
      to={`/t/${x.short_id}/`}
      style={{ textDecoration: "none" }}
    >
      <ThreadCard
        iconSize={43}
        textFontSize={15}
        response={x}
        useFloatingMenu={false}
        showNewThread={true}
        flag={(<Flag
          code="MX"
          height="10.5"
          frameBorder={9}
          style={{ borderRadius: 3 }}
        />)}
        style={{
          padding: "23px 24px 24px",
          borderRadius: 9,
          backgroundColor: "rgb(251, 252, 253)",
          marginBottom: 20,
          color: "#1e2f33",
          cursor: "pointer"
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

      <CommentBox
        iconSize={43}
        btnPlaceholder={'Post'}
        placeholder={'Start a thread'}
      />

      {(isLoading || isError) && <ThreadSkeleton />}
      {!isLoading && feed}
      {isLoadPag && <ThreadSkeleton size={1} />}
    </Layout>
  );
}

export default Home
