import { Link, useLoaderData } from "react-router-dom";
import ReactionsBox from "./ReactionBox";


const ThreadHead = ({ responses, isLoading }) => {
  const data = useLoaderData()
  const storage = _ => {
    localStorage.setItem("snapshot", JSON.stringify({
      data: data.data,
      location: window.scrollY
    }))
  }

  return (
    <div>
      {responses.map((x, k) => (
        <div style={{
          background: 'white',
          marginBottom: 5
        }} key={k}>
          <Link
            onClick={storage}
            to={`/t/${x.short_id}/`}
            style={{
              pointerEvents:
                isLoading ? 'none' : 'auto'
            }}
          >
            {x.text}
          </Link>
          <ReactionsBox
            last={x.last_reaction}
            thread={x.id}
            data={x.reactions}
          />
        </div>
      ))}
    </div>
  )
}

export default ThreadHead
