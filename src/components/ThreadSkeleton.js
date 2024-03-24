import { Skeleton } from "@mui/material"




const ThreadCardSkeleton = props => {
  return (
    <div style={{ position: 'relative', ...props.style }}>
      <div className='response-content'>
        <div style={{ display: 'flex', alignItems:'center', gap: 10 }}>
          <Skeleton
            variant="rounded"
            width={45}
            height={45}
            style={{
              background: '#EAEAEA',
              borderRadius: 7.11
            }}
          />
          <div>
            <Skeleton style={{ background: '#EAEAEA' }} variant="text" width={70} />
          </div>
          <div>
            <Skeleton style={{ background: '#EAEAEA' }} variant="text" width={25} />
          </div>
        </div>

        <Skeleton style={{ background: '#EAEAEA' }} width={'100%'} />
        <Skeleton style={{ background: '#EAEAEA' }} width={'100%'} />
        <Skeleton style={{ background: '#EAEAEA' }} width={'50%'} />
      </div>
    </div>
  )
}


const ThreadSkeleton = (props) => {
  const SKELETON_SIZE = props.size ? props.size : 3
  const data = [...new Array(SKELETON_SIZE).keys()].map((_, k) => (
    <ThreadCardSkeleton
      key={k}
      skeleton={true}
      iconSize={props.iconSize}
      style={{
        padding: "23px 24px 24px",
        borderRadius: 9,
        border: 'solid 1px rgba(235, 235, 235, 1.00)',
        marginBottom: 20,
        color: "#1e2f33",
        ...props.style
      }}
    />
  ))
  return data
}

export default ThreadSkeleton
