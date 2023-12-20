// import { Link, useLoaderData } from "react-router-dom"
// import { queryClient } from "../context/AplicationContext"
// import { paginationService } from "../services/pagination"
// import { useNavigate } from "react-router-dom";
// import checkStorage from "../utils/storage"
// import useThread from "../hooks/useThread";
// import SearchBar from "../components/SearchBar"

import { useQuery } from "react-query";
import { threadService } from "../services/thread";
import { useEffect, useState } from "react"
import Layout from "../components/Layout"
import ThreadCard from "../components/ThreadCard"
import Flag from "react-world-flags"


const SKELETON_LIST = [...new Array(4).keys()].map((x, k) => (
  <ThreadCard
    key={k}
    skeleton={true}
    style={{
      padding: "23px 24px 24px",
      borderRadius: 9,
      backgroundColor: "rgb(251, 252, 253)",
      marginBottom: 20,
      color: "#1e2f33"
    }}
  />
))

const Home = () => {
  const [threads, setThreads] = useState([])
  const { isLoading, data, isError } = useQuery(["threads"],
    () => threadService({}).then((res) => res.data))

  useEffect(() => {
    if (data?.results)
      setThreads(() => data.results)
  }, [data])

  const feed = threads.map((x, k) => (
    <ThreadCard
      key={k}
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
        color: "#1e2f33"
      }}
    />
  ))

  return (
    <Layout
      onPaginate={() => {
        //alert("Hello world")
      }}
    >
      {(isLoading || isError) && SKELETON_LIST}
      {!isLoading && feed}
    </Layout>
  );
  // const { results, next, scrollIndex } = useLoaderData()
  // const navigate = useNavigate();
  // const [threads, setThreads] = useState(results)
  // const [nextUrl, setNext] = useState(next)
  // const [isLoadPagination, setLoadPagination] = useState(false)

  // useEffect(() => {
  //   document.title = `Threup`
  //   window.addEventListener("focus", () => {
  //     checkStorage(() => {
  //       navigate("/")
  //     })
  //   })
  // }, [])

  // return (
  //   <Layout
  //     rigth={(<SearchBar />)}
  //     onPaginate={async () => {
  //       const { data } = queryClient.getQueryState('threads')
  //       setLoadPagination(() => true)
  //       if (nextUrl !== null && !isLoadPagination) {
  //         paginationService({ next: nextUrl }).then((res) => {
  //           data.next = res.data.next
  //           data.results = [...data.results, ...res.data.results]
  //           setThreads((x) => x.concat(res.data.results))
  //           setLoadPagination(() => false)
  //           setNext(() => res.data.next)
  //           queryClient.setQueriesData('threads', data)
  //         })
  //       }
  //     }}
  //     content={{
  //       scrollY: scrollIndex,
  //       onScroll: (e => {
  //         const { data } = queryClient.getQueryState('threads')
  //         data["scrollIndex"] = e.target.scrollTop
  //         queryClient.setQueriesData('threads', data)
  //       }),
  //       component: (
  //         <>
  //           {threads.map((x, k) => (
  //             <Link
  //               to={`/t/${x.short_id}/`}
  //               style={{ textDecoration: "none" }}
  //               key={k}
  //             >
  //               <ThreadCard
  //                 key={k}
  //                 iconSize={43}
  //                 textFontSize={15}
  //                 response={x}
  //                 useFloatingMenu={false}
  //                 showNewThread={true}
  //                 flag={
  //                   <Flag
  //                     code={x.mask.country_code}
  //                     height="10.5"
  //                     frameBorder={9}
  //                     style={{ borderRadius: 2.1192 }}
  //                   />
  //                 }
  //                 style={{
  //                   padding: "23px 24px 24px",
  //                   borderRadius: 9,
  //                   backgroundColor: "rgb(251, 252, 253)",
  //                   marginBottom: 20,
  //                   color: "#1e2f33"
  //                 }}
  //               />
  //             </Link>
  //           ))}

  //           {true !== null && (
  //             <ThreadCard
  //               skeleton={true}
  //               style={{
  //                 padding: "23px 24px 24px",
  //                 borderRadius: 9,
  //                 backgroundColor: "rgb(251, 252, 253)",
  //                 marginBottom: 20,
  //                 color: "#1e2f33"
  //               }}
  //             />
  //           )}
  //         </>
  //       )
  //     }}
  //   />
  // )
}

export default Home
