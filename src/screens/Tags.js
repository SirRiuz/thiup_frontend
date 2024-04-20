import { Link, useParams } from "react-router-dom";
import { threadSearchService } from "../services/thread";
import { paginationService } from "../services/pagination";
import { queryClient } from "../context/AplicationContext";
import { useEffect, useState } from "react";
import { Skeleton } from "@mui/material";
import { useQuery } from "react-query";
import Layout from "../components/Layout";
import ThreadCard from "../components/ThreadCard";
import Flag from "react-world-flags";
import ThreadSkeleton from "../components/ThreadSkeleton";
import HeadBar from "../components/HeadBar";
import styles from "../styles/screens/tag.module.css";
import GoBack from "../components/GoBack";
import ErrorMessage from "../components/ErrorMessage";
import EndFeed from "../components/EndFeed";

export default function Tags() {
  var scrollTimer = -1;
  const { tag } = useParams();
  const [scrollIndex, setScrollIndex] = useState(0);
  const [threads, setThreads] = useState([]);
  const [next, setNext] = useState(null);
  const [isLoadPag, setIsPagLoad] = useState(false);
  const { data, isLoading, isError } = useQuery([tag], () =>
    threadSearchService({ type: "tag", query: tag }).then((res) => res.data)
  );

  const feed = threads.map((x, k) => (
    <Link key={k} to={`/t/${x.short_id}/`} style={{ textDecoration: "none" }}>
      <ThreadCard
        iconSize={43}
        textFontSize={15}
        response={x}
        useFloatingMenu={false}
        showNewThread={true}
        repliesCount={x.responses_count}
        flag={
          <Flag
            code="MX"
            height="10.5"
            frameBorder={9}
            style={{ borderRadius: 3 }}
          />
        }
        style={{
          padding: "20px 20px 20px 20px",
          color: "#2e2f33",
          marginBottom: !(k === threads.length - 1) ? 18 : 0,
          cursor: "pointer",
          background: "#FFFFFF",
          borderRadius: "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
          boxShadow: "rgba(0, 0, 0, .1) 0px 1px 2px 0px",
        }}
      />
    </Link>
  ));

  useEffect(() => {
    document.title = `#${tag} | Thiup`;
    if (data?.scrollIndex) setScrollIndex(() => data?.scrollIndex);
    if (data?.results) {
      setThreads(() => data.results);
      setNext(() => data.next);
    }
  }, [data]);

  return (
    <Layout
      content={{
        scrollY: scrollIndex,
        onScroll: (e) => {
          if (scrollTimer !== -1) clearTimeout(scrollTimer);
          scrollTimer = window.setTimeout(() => {
            const { data } = queryClient.getQueryState(tag);
            data["scrollIndex"] = e.target.scrollTop;
            setScrollIndex(() => e.target.scrollTop);
            queryClient.setQueriesData(tag, data);
          }, 175);
        },
      }}
      onPaginate={() => {
        try {
          if (next && !isLoadPag) {
            const { data } = queryClient.getQueryState(tag);
            setIsPagLoad(() => true);
            paginationService({ next: next })
              .then((res) => res.data)
              .then((res) => {
                setNext(() => res.next);
                setThreads(() => [...threads, ...res.results]);
                data.next = res.next;
                data.results = [...threads, ...res.results];
                queryClient.setQueriesData(tag, data);
              })
              .finally(() => setIsPagLoad(() => false));
          }
        } catch (e) {
          console.error(e);
        }
      }}
    >
      <HeadBar
        negative={!isLoading && <GoBack />}
        subtitle={
          isLoading ? (
            <Skeleton width={"60px"} style={{ background: "#EAEAEA" }} />
          ) : (
            !isError &&
            data?.count >= 1 && (
              <span className={styles.subtitle}>
                {data.count} {data.count > 1 ? "posts" : "post"}
              </span>
            )
          )
        }
        title={
          isLoading ? (
            <Skeleton width={"60px"} style={{ background: "#EAEAEA" }} />
          ) : (
            !isError  && threads.length > 0 && <strong className={styles.title}>#{tag}</strong>
          )
        }
      />
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
          title={<span>🤷 Without result.</span>}
          description={
            <span style={{ fontSize: 15 }}>
              We couldn't find related posts.
            </span>
          }
        />
      )}
    </Layout>
  );
}
