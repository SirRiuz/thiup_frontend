import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { queryClient } from "../context/AplicationContext"
import { threadSearchService } from "../services/thread";
import { paginationService } from "../services/pagination";
import { useQuery } from "react-query";
import Layout from "../components/Layout";
import ThreadCard from "../components/ThreadCard";
import Flag from "react-world-flags";
import ThreadSkeleton from "../components/ThreadSkeleton";


var scrollTimer = -1;

const Search = () => {
  const { query } = useParams();
  const [scrollIndex, setScrollIndex] = useState(0)
  const [threads, setThreads] = useState([])
  const [next, setNext] = useState(null)
  const [isLoadPag, setIsPagLoad] = useState(false)
  const { data, isLoading, isError } = useQuery([query],
    () => threadSearchService({ query: query }).then(
      (res) => res.data))

  const feed = threads.map((x, k) => (
    <Link
      key={k}
      to={`/t/${x.short_id}/`}
      style={{ textDecoration: "none" }}
    >
      <ThreadCard
        search={query}
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

  useEffect(() => {
    document.title = `${query} - Thiup`
    if (data?.scrollIndex)
      setScrollIndex(() => data?.scrollIndex)

    if (data?.results) {
      setThreads(() => data.results)
      setNext(() => data.next)
    }
  }, [data])

  return (
    <Layout
      content={{
        scrollY: scrollIndex,
        onScroll: (e) => {
          if (scrollTimer != -1) { clearTimeout(scrollTimer) }
          scrollTimer = window.setTimeout(() => {
            const { data } = queryClient.getQueryState(query)
            data["scrollIndex"] = e.target.scrollTop
            queryClient.setQueriesData(query, data)
          }, 500);
        }
      }}
      onPaginate={() => {
        try {
          const { data } = queryClient.getQueryState(query)
          if (next) {
            setIsPagLoad(() => true)
            paginationService({ next: next })
              .then((res) => res.data)
              .then(res => {
                setNext(() => res.next)
                setThreads(() => [...threads, ...res.results])

                data.next = res.next
                data.results = [...threads, ...res.results]
                queryClient.setQueriesData(query, data)
              })
              .finally(() => setIsPagLoad(() => false))
          }
        } catch (e) {
          console.log(e)
        }
      }}
    >
      {(isError || isLoading) && <ThreadSkeleton />}
      {!isLoading && !isError && feed}
      {isLoadPag && <ThreadSkeleton size={1} />}
    </Layout>
  )
};

export default Search;
