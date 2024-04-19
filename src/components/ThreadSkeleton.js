import { Skeleton } from "@mui/material";

const ThreadCardSkeleton = (props) => {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
        boxShadow: "rgba(0, 0, 0, .1) 0px 1px 2px 0px",
        ...props.style,
      }}
    >
      <div className="response-content">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Skeleton
            variant="rounded"
            width={45}
            height={45}
            style={{
              background: "#EAEAEA",
              borderRadius: 7.11,
            }}
          />
          <div>
            <Skeleton
              style={{ background: "#EAEAEA" }}
              variant="text"
              width={70}
            />
          </div>
          <div>
            <Skeleton
              style={{ background: "#EAEAEA" }}
              variant="text"
              width={25}
            />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Skeleton style={{ background: "#EAEAEA" }} width={"100%"} />
          <Skeleton style={{ background: "#EAEAEA" }} width={"100%"} />
          <Skeleton style={{ background: "#EAEAEA" }} width={"50%"} />
        </div>
      </div>
    </div>
  );
};

const ThreadSkeleton = (props) => {
  const SKELETON_SIZE = props.size ? props.size : 3;
  const data = [...new Array(SKELETON_SIZE).keys()].map((_, k) => (
    <ThreadCardSkeleton
      key={k}
      skeleton={true}
      iconSize={props.iconSize}
      style={{
        padding: "23px 24px 24px",
        border: "solid 1px rgba(235, 235, 235, 1.00)",
        color: "#1e2f33",
        background: "white",
        marginBottom: 20,
        borderRadius: 9,
        ...props.style,
      }}
    />
  ));
  return data;
};

export default ThreadSkeleton;
