export default function MediaItem(props) {
  return (
    <div
      onClick={props.onClick}
      style={{

        //background: "#" + ((1 << 24) * Math.random() | 0).toString(16).padStart(6, "0"),
        backgroundImage:"url(https://pbs.twimg.com/media/GJiFBhiaQAItqm4?format=jpg&name=large)",
        backgroundPosition:'center',
        backgroundRepeat:'no-repeat',
        backgroundSize:'contain',
        height: 290,
        cursor: "pointer",
        borderRadius: 10,
        ...props.styles
      }}
    >
      {/* <ReactPlayer
        playing={true}
        width={'100%'}
        height={'100%'}
        url='https://video.twimg.com/ext_tw_video/1770774610755129345/pu/vid/avc1/720x1280/XPxRifugrughLJ9j.mp4?tag=12'
      /> */}
    </div>
  )
}
