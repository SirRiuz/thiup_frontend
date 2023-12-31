import ThreadCard from "./ThreadCard"

const ThreadSkeleton = (props) => {
  const data = [...new Array(props.size
    ? props.size : 3).keys()].map((_, k) => (
      <ThreadCard
        key={k}
        skeleton={true}
        iconSize={props.iconSize}
        style={{
          padding: "23px 24px 24px",
          borderRadius: 9,
          backgroundColor: "rgb(251, 252, 253)",
          marginBottom: 20,
          color: "#1e2f33",
          ...props.style
        }}
      />
    ))
  return data
}

export default ThreadSkeleton

