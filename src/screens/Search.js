import { Link, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { queryClient } from "../context/AplicationContext"
import { threadSearchService } from "../services/thread"
import { paginationService } from "../services/pagination"
import { useQuery } from "react-query"
import { Skeleton } from "@mui/material"
import Layout from "../components/Layout"
import ThreadCard from "../components/ThreadCard"
import Flag from "react-world-flags"
import ThreadSkeleton from "../components/ThreadSkeleton"
import HeadBar from "../components/HeadBar"
import GoBack from "../components/GoBack"
import EndFeed from "../components/EndFeed"
import styles from "../styles/screens/search.module.css"
import ErrorMessage from "../components/ErrorMessage"


var scrollTimer = -1

const ThreadHead = props => {
  const { query } = useParams()
  return (
    <HeadBar
      styles={{
        display: "flex",
        alignContent: "center",
        alignItems: "center",
        flex: 1,
        gap: 10,
        marginBottom: 5
      }}
    >
      <GoBack />
      <div>
        <div>
          {props.isLoad ? (
            <Skeleton
              width={"60px"}
              style={{ backgroundColor: "#EAEAEA" }}
            />
          ) : (props.count >= 1 && (
            <strong className={styles.title}>
              "{query}"
            </strong>
          ))}
        </div>

        <div>
          {props.isLoad ? null : (props.count >= 1 && (
            <span className={styles.suptitle}>
              {props.count} {props.count > 1 ? "posts" : "post"}
            </span>
          ))}
        </div>
      </div>
    </HeadBar>
  )
}


export default function Search() {
  const { query } = useParams()
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
        repliesCount={x.responses_count}
        flag={(<Flag
          code="MX"
          height="10.5"
          frameBorder={9}
          style={{ borderRadius: 3 }}
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

  useEffect(() => {
    document.title = `${query} - Search Results | Thiup`
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
          }, 500)
        }
      }}
      onPaginate={() => {
        try {
          const { data } = queryClient.getQueryState(query)
          if (next && !isLoadPag) {
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
        } catch (e) { window.location = "/" }
      }}
    >
      <ThreadHead isLoad={isLoading} count={data?.count} />
      {(isError || isLoading) && <ThreadSkeleton />}
      {!isLoading && !isError && feed}
      {isLoadPag && <ThreadSkeleton style={{ marginTop: 18 }} size={1} />}
      {next === null && !isLoading && threads.length >= 1 && (
        <div style={{ height: 260 }}>
          <EndFeed />
        </div>
      )}

      {!isLoading && !isError && threads.length <= 0 && next === null && (
        <ErrorMessage
          title={(<span>🤷 Without result.</span>)}
          description={(
            <span style={{ fontSize: 15 }}>
              We couldn"t find related posts for
              <strong>"{query}".</strong>
            </span>
          )}
        />
      )}
    </Layout>
  )
}
