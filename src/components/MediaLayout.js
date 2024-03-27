import { isSingle, parseArray } from "../utils/arrays"
import { useState } from "react"
import styles from "../styles/components/MediaLayout.module.css"
import MediaItem from "./MediaItem"
import MediaModalPreview from "./MediaModalPreview"


const calculateMediaItemStyles = (i, l) => (
  {
    flex: 1,
    ...(i.length > 1 ? {
      borderTopLeftRadius: i.length > 1 && l === 0 ? 16 : 0,
      borderBottomLeftRadius: i.length > 1 && l === 0 ? 16 : 0,
      borderTopRightRadius: i.length > 1 && l === (i.length - 1) ? 16 : 0,
      borderBottomRightRadius: i.length > 1 && l === (i.length - 1) ? 16 : 0,
    } : {}),
  }
)

export default function MediaLayout(props) {
  const [data, setData] = useState(null)
  var meidaList = null

  if (!isSingle(props.data)) {
    meidaList = parseArray(props.data).map((i, k) => (
      <div className={styles.multiMedia} key={k}>
        {i.map((z, l) => (
          <MediaItem
            key={l}
            data={z}
            styles={{
              ...calculateMediaItemStyles(i, l),
              backgroundSize: "cover"
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setData(() => z)
            }}
          />
        ))}
      </div>
    ))
  } else {
    meidaList = (
      <MediaItem
        data={props.data[0]}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setData(() => props.data[0])
        }}
        styles={{ height: 516, backgroundSize: "cover" }}
      />
    )
  }

  return (
    <div
      className={styles.mediaLayoutContainer}
      style={{ ...props.styles }}
    >
      {meidaList}
      <MediaModalPreview
        data={data}
        onClose={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setData(() => null)
        }}
      />
    </div>
  )
}
