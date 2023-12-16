import { Link, useLoaderData, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import SearchBar from "../components/SearchBar";
import usePagination from "../hooks/usePagination";
import ThreadCard from "../components/ThreadCard";
import Flag from "react-world-flags";


const Search = () => {
  const { results, next } = useLoaderData();
  const { query } = useParams();
  //const url = new URL(window.location);
  //const query = url.searchParams.get("q");

  //const [threads, setThreads] = useState(results);
  //const [nextUrl, setNext] = useState(next);
  //const [isLoadPagination, setLoadPagination] = useState(false);

  useEffect(() => () => {
    document.title = `${query} - Search result | Threup`
  }, [results]);


  return (
    <Layout
      head={<SearchBar />}
      onPagination={() => {
        // setLoadPagination(() => true);
        // if (next !== null && !isLoadPagination) {
        //   paginate(next, (res) => {
        //     setNext(() => res.next);
        //     setThreads((x) => x.concat(res.results));
        //     setLoadPagination(() => false);
        //   });
        // }
      }}
      content={{
        component: (
          <div>
            {results.map((x, k) => (
              <Link
                to={`/t/${x.short_id}/`}
                style={{ textDecoration: "none" }}
                key={k}
              >
                <ThreadCard
                  search={query}
                  key={k}
                  iconSize={43}
                  textFontSize={15}
                  response={x}
                  useFloatingMenu={false}
                  flag={
                    <Flag
                      code={"col"}
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
          </div>
        )
      }}
    />
  );
};

export default Search;
