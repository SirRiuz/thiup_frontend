import { queryClient } from "../context/AplicationContext";
import { useQuery } from "react-query";
import { threadService } from "../services/thread";
import { useEffect, useState } from "react";
import { paginationService } from "../services/pagination";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import ThreadCard from "../components/ThreadCard";
import Flag from "react-world-flags";
import ThreadSkeleton from "../components/ThreadSkeleton";
import styles from "../styles/screens/home.module.css";
import SearchBar from "../components/SearchBar";
import EndFeed from "../components/EndFeed";
import CommentBox from "../components/Comment";

export default function Home() {
  var scrollTimer = -1;
  const [threads, setThreads] = useState([]);
  const [createdThreads, setCreatedThreads] = useState([]);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [next, setNext] = useState(null);
  const [isLoadPag, setIsPagLoad] = useState(false);
  const { isLoading, data, isError } = useQuery("threads", () =>
    threadService({}).then((res) => res.data)
  );

  useEffect(() => {
    if (data?.scrollIndex) setScrollIndex(() => data?.scrollIndex);
    if (data?.results) {
      setNext(() => data.next);
      setThreads(() => data.results);
    }
  }, [data]);

  const feed = threads.map((x, k) => (
    <Link
      key={k}
      className={styles.thread}
      to={`/t/${x.short_id}/`}
      onClick={(e) => {
        if (!x.short_id) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <ThreadCard
        iconSize={40}
        textFontSize={14}
        response={x}
        showNewThread={true}
        showOp={false}
        repliesCount={x.responses_count}
        flag={
          <Flag
            code="MX"
            height="11"
            frameBorder={9}
            style={{ borderRadius: 3, border: "solid 1px white" }}
          />
        }
        style={{
          color: "#2e2f33",
          cursor: "pointer",
          background: "#FFFFFF",
          borderRadius: "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
          boxShadow: "rgba(0, 0, 0, .1) 0px 1px 2px 0px",
          padding: "20px 20px 20px 20px",
          marginBottom: !(k === threads.length - 1) ? 18 : 0,
        }}
      />
    </Link>
  ));

  return (
    <Layout
      content={{
        scrollY: scrollIndex,
        onScroll: (e) => {
          if (scrollTimer !== -1) clearTimeout(scrollTimer);
          scrollTimer = window.setTimeout(() => {
            const { data } = queryClient.getQueryState("threads");
            data["scrollIndex"] = e.target.scrollTop;
            setScrollIndex(() => e.target.scrollTop);
            queryClient.setQueriesData("threads", data);
          }, 175);
        },
      }}
      onPaginate={() => {
        try {
          if (next && !isLoadPag) {
            const { data } = queryClient.getQueryState(["threads"]);
            setIsPagLoad(() => true);
            paginationService({ next: next })
              .then((res) => res.data)
              .then((res) => {
                setNext(() => res.next);
                setThreads(() => [...threads, ...res.results]);
                data.next = res.next;
                data.results = [...threads, ...res.results];
                queryClient.setQueriesData("threads", data);
              })
              .finally(() => setIsPagLoad(() => false));
          }
        } catch (e) {
          window.location = "/";
        }
      }}
    >
      {!isLoading && feed && !isError && feed && (
        <SearchBar
          styles={{
            marginTop: 20,
            marginBottom: 27,
          }}
        />
      )}

      {!isLoading && feed && !isError && feed && (
        <div
          style={{
            marginBottom: 35,
            boxShadow: "rgba(0, 0, 0, .1) 0px 1px 2px 0px",
            background: "white",
            paddingTop: 5,
            paddingBottom: 5,
            borderRadius: "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
          }}
        >
          <CommentBox
            iconSize={43}
            btnPlaceholder={"Post"}
            placeholder={"Start a thread"}
            onComplete={(t) => {
              setCreatedThreads(() => [t, ...createdThreads]);
            }}
          />
        </div>
      )}
      <div>
        {createdThreads.map((x, k) => (
          <Link
            key={k}
            className={styles.thread}
            to={`/t/${x.short_id}/`}
            onClick={(e) => {
              if (!x.short_id) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <ThreadCard
              iconSize={40}
              textFontSize={14}
              response={x}
              showNewThread={true}
              showOp={false}
              repliesCount={x.responses_count}
              flag={
                <Flag
                  code="MX"
                  height="11"
                  frameBorder={9}
                  style={{ borderRadius: 3, border: "solid 1px white" }}
                />
              }
              style={{
                color: "#2e2f33",
                cursor: "pointer",
                background: "#FFFFFF",
                borderRadius:
                  "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
                boxShadow: "rgba(0, 0, 0, .1) 0px 1px 2px 0px",
                padding: "20px 20px 20px 20px",
                marginBottom: !(k === threads.length - 1) ? 18 : 0,
              }}
            />
          </Link>
        ))}
      </div>

      {(isLoading || isError) && (
        <div style={{ marginTop: 55 }}>
          <ThreadSkeleton
            style={{
              background: "white",
            }}
          />
        </div>
      )}

      {!isLoading && feed}

      {isLoadPag && (
        <ThreadSkeleton
          style={{ marginTop: 18, background: "white" }}
          size={1}
        />
      )}

      {next === null && !isLoading && threads.length >= 1 && (
        <div style={{ height: 260 }}>
          <EndFeed />
        </div>
      )}
    </Layout>
  );
}
