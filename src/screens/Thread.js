import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { threadService } from "../services/thread";
import { useQuery } from "react-query";
import { queryClient } from "../context/AplicationContext";
import { Skeleton } from "@mui/material";
import { paginationService } from "../services/pagination";
import CommentBox from "../components/Comment";
import TimeLine from "../components/TimeLine";
import ThreadCard from "../components/ThreadCard";
import Flag from "react-world-flags";
import Layout from "../components/Layout";
import ThreadSkeleton from "../components/ThreadSkeleton";
import HeadBar from "../components/HeadBar";
import GoBack from "../components/GoBack";
import styles from "../styles/screens/thread.module.css";
import ErrorMessage from "../components/ErrorMessage";
import EndFeed from "../components/EndFeed";
import Separator from "../components/Separator";

const ThreadLoader = () => (
  <div>
    <ThreadSkeleton style={{ marginBottom: 50 }} size={1} />
    <ThreadSkeleton
      size={1}
      style={{ marginBottom: 0, borderRadius: "10px 10px 0px 0px" }}
    />
    <ThreadSkeleton
      size={1}
      style={{
        marginBottom: 0,
        borderRadius: "0px 0px 10px 10px",
        borderTop: "solid 0px white",
      }}
    />
  </div>
);

export default function Thread() {
  var scrollTimer = -1;
  const { thread } = useParams();
  const [threads, setThreads] = useState([]);
  const [head, setHead] = useState(null);
  const [count, setCount] = useState(0);
  const [isLoadPag, setIsPagLoad] = useState(false);
  const [focusBox, setFocusBox] = useState(false);
  const [next, setNext] = useState(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const { data, isLoading, isError } = useQuery(thread, () =>
    threadService({ id: thread }).then((res) => res.data)
  );

  /**
   * Refreshes the timeline of comments when a 
   * new one is added.
   */
  const onRefreshThread = (t) => {
    const { data } = queryClient.getQueryState(thread);
    data.results = threads.concat(t);
    queryClient.setQueriesData(thread, data);
    setThreads(() => threads.concat(t));
    setCount((e) => threads.length + 1);
  };

  useEffect(() => {
    if (data?.scrollIndex) setScrollIndex(() => data?.scrollIndex);
    if (data?.results && data?.head) {
      setThreads(() => data.results);
      setHead(() => data.head);
      setNext(() => data.next);
      setCount(() => data.count);
      document.title = `${data.head.text} - Thiup`;
      window.scrollTo(0, 0);
    }
  }, [data]);

  return (
    <Layout
      content={{
        scrollY: scrollIndex,
        onScroll: (e) => {
          if (scrollTimer !== -1) clearTimeout(scrollTimer);
          scrollTimer = window.setTimeout(() => {
            const { data } = queryClient.getQueryState(thread);
            data["scrollIndex"] = e.target.scrollTop;
            setScrollIndex(() => e.target.scrollTop);
            queryClient.setQueriesData(thread, data);
          }, 175);
        },
      }}
      onPaginate={() => {
        if (next && !isLoadPag) {
          const { data } = queryClient.getQueryState(thread);
          setIsPagLoad(() => true);
          paginationService({ next: next })
            .then((res) => res.data)
            .then((res) => {
              setNext(() => res.next);
              setThreads(() => threads.concat(res.results));
              data.next = res.next;
              data.results = threads.concat(res.results);
              queryClient.setQueriesData(thread, data);
            })
            .finally(() => setIsPagLoad(() => false));
        }
      }}
    >
      <HeadBar
        negative={!isLoading && <GoBack />}
        title={
          isLoading ? (
            <Skeleton width={"60px"} style={{ background: "#EAEAEA" }} />
          ) : (
            !isError && <span className={styles.title}>Thread</span>
          )
        }
      />
      {isLoading && <ThreadLoader />}
      {head && !isLoading && !isError && (
        <div>
          <ThreadCard
            isHead={true}
            iconSize={43}
            textFontSize={17}
            useFloatingMenu={true}
            response={head}
            showNewThread={true}
            enableReactions={true}
            onComment={() => setFocusBox(() => true)}
            onChangeReaction={(reaction) => {
              const { data } = queryClient.getQueryState(thread);
              if (data?.head) {
                data.head.last_reaction = reaction;
                queryClient.setQueriesData(thread, data);
              }
            }}
            style={{
              padding: "20px 20px 20px 20px",
              color: "#2e2f33",
              background: "white",
              boxShadow: "rgba(0, 0, 0, .1) 0px 1px 2px 0px",
              borderRadius:
                "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
            }}
            flag={
              <Flag
                code={head?.mask?.country_code}
                height="10.5"
                frameBorder={10}
                style={{ borderRadius: 3.1192, border: "solid 1px white" }}
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
                    border: "solid 1px white",
                  }}
                />
                <Separator />
              </>
            )}
            <div
              className={styles.commentBoxContainer}
              style={{
                borderTopRightRadius: count >= 1 ? 0 : "auto",
                borderTopLeftRadius: count >= 1 ? 0 : "auto",
                borderRadius:
                  "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
              }}
            >
              <CommentBox
                id={head.id}
                focus={focusBox}
                placeholder={"Post your reply"}
                iconSize={30}
                onComplete={onRefreshThread}
                onBlur={() => setFocusBox(() => false)}
                style={{ borderRadius: 6.5 }}
              />
            </div>
          </div>
        </div>
      )}

      {next === null && !isLoading && !isError && (
        <div style={{ height: 250 }}>{threads.length >= 1 && <EndFeed />}</div>
      )}

      {isError && (
        <ErrorMessage
          title={<span>🔍 Post not available.</span>}
          description={
            <span style={{ fontSize: 15 }}>
              We could not find a post associated with the provided ID.
            </span>
          }
        />
      )}
    </Layout>
  );
}
