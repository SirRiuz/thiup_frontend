import { useLoaderData } from "react-router-dom";
import { useEffect, useState } from "react";
import { paginationService } from "../services/pagination";
import CommentBox from "../components/Comment";
import TimeLine from "../components/TimeLine";
import ThreadCard from "../components/ThreadCard";
import Flag from "react-world-flags";
import Layout from "../components/Layout";
import "../styles/screens/thread.css";


const Thread = () => {
  const { head, results, next, count } = useLoaderData();
  const [threads, setThreads] = useState(results);
  const [focusBox, setFocusBox] = useState(false);
  const [nextUrl, setNext] = useState(next);
  const [isLoadPagination, setLoadPagination] = useState(false);
  const onRefreshThread = (e) => setThreads(() => [...threads, e.data]);

  const comentsCount =
    count > 0
      ? count + (threads.length - count)
      : threads.length > 0
        ? threads.length
        : undefined;

  useEffect(() => {
    (() => {
      document.title = `${head.text}`;
      window.scrollTo(0, 0);
    })();
  }, []);

  return (
    <Layout
      onPaginate={_ => {
        setLoadPagination(() => true)
        if (nextUrl !== null && !isLoadPagination) {
          paginationService({ next: nextUrl }).then((res) => {
            setThreads((x) => x.concat(res.data.results))
            setLoadPagination(() => false)
            setNext(() => res.data.next)
          })
        }
      }}
      content={{
        component: (
          <>
            <ThreadCard
              isHead={true}
              iconSize={43}
              textFontSize={15}
              response={head}
              showNewThread={true}
              onComment={() => setFocusBox(() => true)}
              style={{
                padding: "24px 24px 24px",
                borderRadius: 10,
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
            <div
              style={{
                marginBottom: 25,
                marginTop: 40,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  lineHeight: "20px",
                }}
              >
                {comentsCount} Comments
              </span>
            </div>

            <div className="threads-root">
              <TimeLine
                parent={head}
                responses={threads}
              />
              <div
                style={{
                  background: "rgb(252, 252, 253)",
                  padding: 13,
                  borderRadius: 11,
                }}
              >
                {isLoadPagination && nextUrl !== null && (<h1 style={{ background: 'red' }}>load</h1>)}
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
                    rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset
                  `,
                  }}
                />
              </div>
            </div>
          </>
        )
      }}
    />
  );
};

export default Thread;
