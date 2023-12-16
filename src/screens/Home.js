import { Link, useLoaderData } from "react-router-dom"
import { useEffect, useState } from "react"
import { queryClient } from "../context/AplicationContext"
import { paginationService } from "../services/pagination"
import Layout from "../components/Layout"
import SearchBar from "../components/SearchBar"
import ThreadCard from "../components/ThreadCard"
import Flag from "react-world-flags"



const Home = () => {
  const { results, next, scrollIndex } = useLoaderData()
  const [threads, setThreads] = useState(results)
  const [nextUrl, setNext] = useState(next)
  const [isLoadPagination, setLoadPagination] = useState(false)

  useEffect(() => {
    document.title = `Threup`
  }, [])

  return (
    <Layout
      rigth={(<SearchBar />)}
      onPaginate={() => {
        const { data } = queryClient.getQueryState('threads')
        setLoadPagination(() => true)
        if (nextUrl !== null && !isLoadPagination) {
          paginationService({ next: nextUrl }).then((res) => {
            data.next = res.data.next
            data.results = [...data.results, ...res.data.results]
            setThreads((x) => x.concat(res.data.results))
            setLoadPagination(() => false)
            setNext(() => res.data.next)
            queryClient.setQueriesData('threads', data)
          })
        }
      }}

      content={{
        scrollY: scrollIndex,
        onScroll: (e => {
          const { data } = queryClient.getQueryState('threads')
          data["scrollIndex"] = e.target.scrollTop
          queryClient.setQueriesData('threads', data)
        }),
        component: (
          <>
            {threads.map((x, k) => (
              <Link
                to={`/t/${x.short_id}/`}
                style={{ textDecoration: "none" }}
                key={k}
              >
                <ThreadCard
                  key={k}
                  iconSize={43}
                  textFontSize={15}
                  response={x}
                  useFloatingMenu={false}
                  flag={
                    <Flag
                      code={"co"}
                      height="10.5"
                      frameBorder={9}
                      style={{ borderRadius: 2.1192 }}
                    />
                  }
                  style={{
                    padding: "23px 24px 24px",
                    borderRadius: 9,
                    backgroundColor: "rgb(251, 252, 253)",
                    marginBottom: 20,
                    color: "#1e2f33"
                  }}
                />
              </Link>
            ))}
            {isLoadPagination && nextUrl !== null && (
              <h1 style={{ background: 'red' }}>load</h1>
            )}
          </>
        )
      }}
    />
  )
}

export default Home
